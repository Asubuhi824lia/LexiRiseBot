import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export const isProd = process.env.NODE_ENV === 'production'
export const PORT = Number(process.env.PORT) || 3001
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
export const OTP_PEPPER = process.env.OTP_PEPPER || randomBytes(32).toString('hex')
export const SESSION_DAYS = 7
export const OTP_TTL_MS = 5 * 60 * 1000
export const OTP_RESEND_MS = 60 * 1000
export const OTP_MAX_ATTEMPTS = 5
export const PAYLOAD_MAX_AGE_MS = 2 * 60 * 1000
export const BCRYPT_ROUNDS = 12
export const COOKIE_NAME = 'lr_sid'
export const REQUEST_HEADER = 'LexiRiseBot'
export const DATA_DIR = path.resolve(here, '../data')
export const DB_PATH = path.join(DATA_DIR, 'users.db')
export const LAST_OTP_PATH = path.join(DATA_DIR, 'last-otp.json')
