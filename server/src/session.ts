import { createHash, randomBytes } from 'node:crypto'
import type { CookieOptions, Response } from 'express'
import { COOKIE_NAME, SESSION_DAYS, isProd } from './config.ts'
import { asSession, asUser, queries, type UserRow } from './db.ts'

const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MS,
  }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  queries.insertSession.run(crypto.randomUUID(), userId, hashToken(token), now + SESSION_MS, now)
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

export function clearSession(res: Response, token?: string) {
  if (token) queries.deleteSessionByToken.run(hashToken(token))
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 })
}

export function userFromToken(token?: string): UserRow | undefined {
  if (!token) return undefined
  const session = asSession(queries.getSession.get(hashToken(token), Date.now()))
  if (!session) return undefined
  return asUser(queries.getUserById.get(session.user_id))
}
