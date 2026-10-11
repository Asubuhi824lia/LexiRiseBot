import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { OTP_PEPPER, LAST_OTP_PATH, isProd } from './config.ts'

export function generateOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashOtp(challengeId: string, code: string) {
  return createHmac('sha256', OTP_PEPPER).update(`${challengeId}:${code}`).digest('hex')
}

export function otpMatches(challengeId: string, code: string, expectedHex: string) {
  const actual = Buffer.from(hashOtp(challengeId, code), 'hex')
  const expected = Buffer.from(expectedHex, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function persistDevOtp(to: string, code: string) {
  if (isProd) return
  console.info(`[dev-otp] ${to} code=${code}`)
  writeFileSync(
    LAST_OTP_PATH,
    `${JSON.stringify({ to, code, at: new Date().toISOString() })}\n`,
    { mode: 0o600 },
  )
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, 1)
  return `${visible}***@${domain}`
}
