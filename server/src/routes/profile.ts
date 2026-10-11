import { Router } from 'express'
import multer from 'multer'
import { decryptEnvelope } from '../crypto.ts'
import { asUser, queries } from '../db.ts'
import { AppError } from '../errors.ts'
import { requireUser, type AuthedRequest } from '../middleware.ts'
import { envelopeSchema, loginUpdateSchema } from '../validation.ts'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
})

function detectImage(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
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

export const profileRouter = Router()
profileRouter.use(requireUser)

profileRouter.get('/user', (req, res) => {
  res.json({ user: publicUser((req as AuthedRequest).user.id) })
})

profileRouter.patch('/me/login', (req, res) => {
  const { login } = loginUpdateSchema.parse(decryptEnvelope(envelopeSchema.parse(req.body)))
  const current = (req as AuthedRequest).user
  const existing = asUser(queries.getUserByLogin.get(login))
  if (existing && existing.id !== current.id) {
    throw new AppError(409, 'Логин уже занят')
  }
  queries.updateLogin.run(login, Date.now(), current.id)
  res.json({ user: publicUser(current.id) })
})

profileRouter.get('/me/avatar', (req, res) => {
  const row = queries.getAvatar.get((req as AuthedRequest).user.id) as
    | { avatar_blob: Uint8Array | null; avatar_mime: string | null }
    | undefined
  if (!row?.avatar_blob || !row.avatar_mime) {
    throw new AppError(404, 'Аватар не загружен')
  }
  res.setHeader('Content-Type', row.avatar_mime)
  res.setHeader('Cache-Control', 'private, no-store')
  res.send(Buffer.from(row.avatar_blob))
})

profileRouter.post('/me/avatar', upload.single('avatar'), (req, res) => {
  const file = req.file
  if (!file) throw new AppError(400, 'Выберите изображение')
  const mime = detectImage(file.buffer)
  if (!mime) throw new AppError(400, 'Нужен JPEG, PNG или WebP')
  queries.updateAvatar.run(file.buffer, mime, Date.now(), (req as AuthedRequest).user.id)
  res.json({ user: publicUser((req as AuthedRequest).user.id) })
})

profileRouter.delete('/me/avatar', (req, res) => {
  queries.updateAvatar.run(null, null, Date.now(), (req as AuthedRequest).user.id)
  res.json({ user: publicUser((req as AuthedRequest).user.id) })
})
