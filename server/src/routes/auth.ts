import { randomInt, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import { BCRYPT_ROUNDS, COOKIE_NAME, OTP_MAX_ATTEMPTS, OTP_RESEND_MS, OTP_TTL_MS } from '../config.ts'
import { decryptEnvelope } from '../crypto.ts'
import { asChallenge, asUser, cleanupExpired, queries } from '../db.ts'
import { AppError } from '../errors.ts'
import { sendEmailCode } from '../notify.ts'
import { generateOtp, hashOtp, maskEmail, otpMatches } from '../otp.ts'
import { clearSession, createSession } from '../session.ts'
import { issueTotp, totpAuthUrl, totpMatches } from '../totp.ts'
import {
  emailSchema,
  envelopeSchema,
  factorPayloadSchema,
  loginSchema,
  otpSchema,
  passwordSchema,
  resendPayloadSchema,
  startPayloadSchema,
  verifyPayloadSchema,
} from '../validation.ts'
type ChallengeResponse = {
  challengeId: string
  channel: 'email' | 'totp'
  hasEmail: boolean
  needsTotpEnroll: boolean
  hint?: string
  retryAfterSec?: number
  otpauthUrl?: string
  totpSecret?: string
  generatedLogin?: string
}

/** Пауза на `/start`: сложнее отличить «нет пользователя» от «есть» по времени ответа. */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uniqueLogin(base: string) {
  let candidate = base.slice(0, 32)
  let n = 0
  while (queries.getUserByLogin.get(candidate)) {
    n += 1
    const suffix = `_${n}`
    candidate = `${base.slice(0, 32 - suffix.length)}${suffix}`
  }
  return candidate
}

function loginFromEmail(email: string) {
  const local = email
    .split('@')[0]
    ?.replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 16)
  const base = local && local.length >= 3 ? local : `user${randomInt(100, 999)}`
  return uniqueLogin(base)
}

function publicUser(id: string) {
  const row = queries.getUserPublic.get(id) as
    | {
        id: string
        login: string
        email: string | null
        created_at: number
        updated_at: number
        has_avatar: number
      }
    | undefined
  if (!row) throw new AppError(404, 'Пользователь не найден')
  return {
    id: row.id,
    login: row.login,
    email: row.email,
    hasAvatar: row.has_avatar === 1,
    createdAt: row.created_at,
  }
}

function readEnvelope(body: unknown) {
  const parsed = envelopeSchema.parse(body)
  return decryptEnvelope(parsed)
}

function toPublicChallenge(input: {
  challengeId: string
  channel: 'email' | 'totp'
  email?: string | null
  otpauthUrl?: string
  totpSecret?: string
  generatedLogin?: string
  needsTotpEnroll?: boolean
}): ChallengeResponse {
  return {
    challengeId: input.challengeId,
    channel: input.channel,
    hasEmail: Boolean(input.email),
    needsTotpEnroll: Boolean(input.needsTotpEnroll),
    generatedLogin: input.generatedLogin,
    hint: input.email ? maskEmail(input.email) : undefined,
    retryAfterSec: input.channel === 'email' ? 60 : undefined,
    otpauthUrl: input.otpauthUrl,
    totpSecret: input.needsTotpEnroll ? input.totpSecret : undefined,
  }
}

function fakeChallenge(channel: 'email' | 'totp'): ChallengeResponse {
  return {
    challengeId: randomUUID(),
    channel,
    hasEmail: false,
    needsTotpEnroll: false,
    retryAfterSec: channel === 'email' ? 60 : undefined,
    hint: channel === 'email' ? '***' : undefined,
  }
}

async function passwordMatches(password: string, hash: string | null) {
  if (!hash) return false
  return bcrypt.compare(password, hash)
}

function createChallenge(input: {
  purpose: 'login' | 'register'
  channel: 'email' | 'totp'
  login?: string | null
  email?: string | null
  passwordHash?: string | null
  userId?: string | null
  totpSecret?: string | null
  otpauthUrl?: string
  sendEmail?: boolean
  generatedLogin?: string
  needsTotpEnroll?: boolean
}): ChallengeResponse {
  const id = randomUUID()
  const now = Date.now()
  const emailCode = input.sendEmail ? generateOtp() : null
  queries.insertChallenge.run(
    id,
    input.purpose,
    input.channel,
    input.login ?? null,
    input.passwordHash ?? null,
    input.email ?? null,
    input.userId ?? null,
    hashOtp(id, emailCode ?? 'totp'),
    input.totpSecret ?? null,
    now + OTP_TTL_MS,
    now,
    now,
  )

  if (emailCode && input.email) {
    sendEmailCode(input.email, emailCode)
  }

  return toPublicChallenge({
    challengeId: id,
    channel: input.channel,
    email: input.email,
    otpauthUrl: input.otpauthUrl,
    totpSecret: input.totpSecret ?? undefined,
    generatedLogin: input.generatedLogin,
    needsTotpEnroll: input.needsTotpEnroll,
  })
}

async function startAuth(payload: z.infer<typeof startPayloadSchema>) {
  cleanupExpired()
  await sleep(randomInt(80, 180))
  const password = passwordSchema.parse(payload.password)

  if (payload.mode === 'register') {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    if (payload.identifier === 'login') {
      const login = loginSchema.parse(payload.login)
      if (queries.getUserByLogin.get(login)) throw new AppError(409, 'Логин уже занят')
      const totp = issueTotp(login)
      return createChallenge({
        purpose: 'register',
        channel: 'totp',
        login,
        passwordHash,
        totpSecret: totp.secret,
        otpauthUrl: totp.otpauthUrl,
        needsTotpEnroll: true,
      })
    }

    const email = emailSchema.parse(payload.email)
    if (queries.getUserByEmail.get(email)) throw new AppError(409, 'Этот контакт уже используется')
    const login = loginFromEmail(email)
    return createChallenge({
      purpose: 'register',
      channel: 'email',
      login,
      email,
      passwordHash,
      sendEmail: true,
      generatedLogin: login,
    })
  }

  if (payload.identifier === 'login') {
    const login = loginSchema.parse(payload.login)
    const user = asUser(queries.getUserByLogin.get(login))
    if (!user || !(await passwordMatches(password, user.password_hash))) {
      return fakeChallenge('totp')
    }
    if (user.totp_secret) {
      return createChallenge({
        purpose: 'login',
        channel: 'totp',
        login: user.login,
        email: user.email,
        userId: user.id,
        totpSecret: user.totp_secret,
      })
    }
    const totp = issueTotp(user.login)
    return createChallenge({
      purpose: 'login',
      channel: 'totp',
      login: user.login,
      email: user.email,
      userId: user.id,
      totpSecret: totp.secret,
      otpauthUrl: totp.otpauthUrl,
      needsTotpEnroll: true,
    })
  }

  const email = emailSchema.parse(payload.email)
  const user = asUser(queries.getUserByEmail.get(email))
  if (!user || !(await passwordMatches(password, user.password_hash))) {
    return fakeChallenge('email')
  }
  return createChallenge({
    purpose: 'login',
    channel: 'email',
    login: user.login,
    email: user.email,
    userId: user.id,
    totpSecret: user.totp_secret,
    sendEmail: true,
  })
}

function switchFactor(payload: z.infer<typeof factorPayloadSchema>) {
  cleanupExpired()
  const challenge = asChallenge(queries.getChallenge.get(payload.challengeId))
  const now = Date.now()
  if (!challenge || challenge.consumed_at || challenge.expires_at < now) {
    throw new AppError(400, 'Запросите код заново')
  }

  if (payload.channel === 'email') {
    const rawEmail = payload.email ?? challenge.email
    if (!rawEmail) throw new AppError(400, 'Укажите почту')
    const email = emailSchema.parse(rawEmail)
    const existing = asUser(queries.getUserByEmail.get(email))
    if (existing && existing.id !== challenge.user_id) {
      throw new AppError(409, 'Этот контакт уже используется')
    }
    const code = generateOtp()
    queries.updateChallengeFactor.run(
      'email',
      email,
      challenge.totp_secret,
      hashOtp(challenge.id, code),
      now + OTP_TTL_MS,
      now,
      challenge.id,
    )
    sendEmailCode(email, code)
    return toPublicChallenge({
      challengeId: challenge.id,
      channel: 'email',
      email,
      generatedLogin: challenge.purpose === 'register' ? challenge.login ?? undefined : undefined,
    })
  }

  const label = challenge.login || 'user'
  const user = challenge.user_id ? asUser(queries.getUserById.get(challenge.user_id)) : undefined
  const needsTotpEnroll = !user?.totp_secret
  const secret = user?.totp_secret ?? challenge.totp_secret ?? issueTotp(label).secret
  const otpauthUrl = needsTotpEnroll ? totpAuthUrl(secret, label) : undefined

  queries.updateChallengeFactor.run(
    'totp',
    challenge.email,
    secret,
    hashOtp(challenge.id, 'totp'),
    now + OTP_TTL_MS,
    now,
    challenge.id,
  )

  return toPublicChallenge({
    challengeId: challenge.id,
    channel: 'totp',
    email: challenge.email,
    otpauthUrl,
    totpSecret: secret,
    needsTotpEnroll,
    generatedLogin: challenge.purpose === 'register' ? challenge.login ?? undefined : undefined,
  })
}

export const authRouter = Router()

authRouter.post('/start', async (req, res) => {
  const payload = startPayloadSchema.parse(readEnvelope(req.body))
  res.json(await startAuth(payload))
})

authRouter.post('/factor', (req, res) => {
  const payload = factorPayloadSchema.parse(readEnvelope(req.body))
  res.json(switchFactor(payload))
})

authRouter.post('/verify', (req, res) => {
  const payload = verifyPayloadSchema.parse(readEnvelope(req.body))
  const challenge = asChallenge(queries.getChallenge.get(payload.challengeId))
  const now = Date.now()

  if (
    !challenge ||
    challenge.consumed_at ||
    challenge.expires_at < now ||
    challenge.attempts >= OTP_MAX_ATTEMPTS
  ) {
    throw new AppError(400, 'Неверный или просроченный код')
  }

  const totp = challenge.method === 'totp'
  const secret = challenge.totp_secret
  const codeOk = totp
    ? Boolean(secret && totpMatches(secret, payload.code))
    : otpSchema.safeParse(payload.code).success && otpMatches(challenge.id, payload.code, challenge.code_hash)

  if (!codeOk) {
    queries.bumpChallengeAttempts.run(challenge.id)
    throw new AppError(400, 'Неверный или просроченный код')
  }

  queries.consumeChallenge.run(now, challenge.id)

  let userId = challenge.user_id
  if (challenge.purpose === 'register') {
    userId = randomUUID()
    queries.insertUser.run(
      userId,
      challenge.login,
      challenge.password_hash,
      challenge.email,
      totp ? challenge.totp_secret : null,
      now,
      now,
    )
  } else if (userId) {
    const user = asUser(queries.getUserById.get(userId))
    if (!user) throw new AppError(400, 'Неверный или просроченный код')
    if (challenge.email) {
      const existing = asUser(queries.getUserByEmail.get(challenge.email))
      if (existing && existing.id !== userId) {
        throw new AppError(409, 'Этот контакт уже используется')
      }
      if (user.email !== challenge.email) {
        queries.updateUserEmail.run(challenge.email, now, userId)
      }
    }
    if (totp && challenge.totp_secret && user.totp_secret !== challenge.totp_secret) {
      queries.updateUserTotp.run(challenge.totp_secret, now, userId)
    }
  }

  if (!userId) {
    throw new AppError(400, 'Неверный или просроченный код')
  }

  createSession(res, userId)
  res.json({ user: publicUser(userId) })
})

authRouter.post('/resend', (req, res) => {
  const payload = resendPayloadSchema.parse(readEnvelope(req.body))
  const challenge = asChallenge(queries.getChallenge.get(payload.challengeId))
  const now = Date.now()

  if (!challenge || challenge.consumed_at || challenge.expires_at < now || challenge.method === 'totp') {
    throw new AppError(400, 'Запросите код заново')
  }
  if (now - challenge.last_sent_at < OTP_RESEND_MS) {
    throw new AppError(429, 'Подождите перед повторной отправкой')
  }
  if (!challenge.email) throw new AppError(400, 'Запросите код заново')

  const code = generateOtp()
  queries.updateChallengeCode.run(hashOtp(challenge.id, code), now + OTP_TTL_MS, now, challenge.id)
  sendEmailCode(challenge.email, code)

  res.json(
    toPublicChallenge({
      challengeId: challenge.id,
      channel: 'email',
      email: challenge.email,
      generatedLogin: challenge.purpose === 'register' ? challenge.login ?? undefined : undefined,
    }),
  )
})

authRouter.post('/logout', (req, res) => {
  clearSession(res, req.cookies?.[COOKIE_NAME])
  res.status(204).end()
})
