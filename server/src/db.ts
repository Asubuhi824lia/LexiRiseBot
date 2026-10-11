import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { DATA_DIR, DB_PATH } from './config.ts'

export type UserRow = {
  id: string
  login: string
  password_hash: string | null
  email: string | null
  totp_secret: string | null
  avatar_blob: Uint8Array | null
  avatar_mime: string | null
  created_at: number
  updated_at: number
}

export type ChallengeRow = {
  id: string
  purpose: string
  method: string
  login: string | null
  password_hash: string | null
  email: string | null
  totp_secret: string | null
  user_id: string | null
  code_hash: string
  expires_at: number
  attempts: number
  last_sent_at: number
  consumed_at: number | null
  created_at: number
}

export type SessionRow = {
  id: string
  user_id: string
  token_hash: string
  expires_at: number
  created_at: number
}

mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    login TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    email TEXT UNIQUE COLLATE NOCASE,
    avatar_blob BLOB,
    avatar_mime TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    purpose TEXT NOT NULL,
    method TEXT NOT NULL,
    login TEXT,
    password_hash TEXT,
    email TEXT,
    user_id TEXT,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at INTEGER NOT NULL,
    consumed_at INTEGER,
    created_at INTEGER NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) STRICT;

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);
`)

function tableColumns(table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
}

function ensureColumn(table: string, name: string, definition: string) {
  if (!tableColumns(table).some((column) => column.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
}

ensureColumn('users', 'totp_secret', 'TEXT')
ensureColumn('challenges', 'totp_secret', 'TEXT')

export const queries = {
  insertUser: db.prepare(`
    INSERT INTO users (id, login, password_hash, email, totp_secret, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByLogin: db.prepare('SELECT * FROM users WHERE login = ?'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserPublic: db.prepare(`
    SELECT id, login, email, created_at, updated_at,
      CASE WHEN avatar_blob IS NULL THEN 0 ELSE 1 END AS has_avatar
    FROM users WHERE id = ?
  `),
  updateLogin: db.prepare('UPDATE users SET login = ?, updated_at = ? WHERE id = ?'),
  updateAvatar: db.prepare(
    'UPDATE users SET avatar_blob = ?, avatar_mime = ?, updated_at = ? WHERE id = ?',
  ),
  getAvatar: db.prepare('SELECT avatar_blob, avatar_mime FROM users WHERE id = ?'),
  insertChallenge: db.prepare(`
    INSERT INTO challenges (
      id, purpose, method, login, password_hash, email, user_id,
      code_hash, totp_secret, expires_at, attempts, last_sent_at, consumed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, ?)
  `),
  getChallenge: db.prepare('SELECT * FROM challenges WHERE id = ?'),
  updateChallengeCode: db.prepare(
    'UPDATE challenges SET code_hash = ?, expires_at = ?, last_sent_at = ?, attempts = 0 WHERE id = ?',
  ),
  updateChallengeFactor: db.prepare(`
    UPDATE challenges
    SET method = ?, email = ?, totp_secret = ?, code_hash = ?, expires_at = ?, last_sent_at = ?, attempts = 0
    WHERE id = ?
  `),
  updateUserEmail: db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?'),
  updateUserTotp: db.prepare('UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?'),
  bumpChallengeAttempts: db.prepare('UPDATE challenges SET attempts = attempts + 1 WHERE id = ?'),
  consumeChallenge: db.prepare('UPDATE challenges SET consumed_at = ? WHERE id = ?'),
  insertSession: db.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
  ),
  getSession: db.prepare(
    'SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?',
  ),
  deleteSessionByToken: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  deleteExpiredSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  deleteExpiredChallenges: db.prepare(
    'DELETE FROM challenges WHERE expires_at <= ? OR consumed_at IS NOT NULL',
  ),
}

export function asUser(row: unknown): UserRow | undefined {
  return row as UserRow | undefined
}

export function asChallenge(row: unknown): ChallengeRow | undefined {
  return row as ChallengeRow | undefined
}

export function asSession(row: unknown): SessionRow | undefined {
  return row as SessionRow | undefined
}

export function cleanupExpired() {
  const now = Date.now()
  queries.deleteExpiredSessions.run(now)
  queries.deleteExpiredChallenges.run(now)
}
