import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import multer from 'multer'
import { ZodError } from 'zod'
import { CLIENT_ORIGIN, DATA_DIR, PORT, isProd } from './config.ts'
import { getPublicJwk, initCrypto } from './crypto.ts'
import { cleanupExpired } from './db.ts'
import { AppError } from './errors.ts'
import { errorHandler, requireCustomHeader } from './middleware.ts'
import { authRouter } from './routes/auth.ts'
import { profileRouter } from './routes/profile.ts'

export function startServer() {
  initCrypto()
  cleanupExpired()

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', false)

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  )
  app.use(
    cors({
      origin: CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
    }),
  )
  app.use(cookieParser())
  app.use(express.json({ limit: '64kb' }))
  app.use(requireCustomHeader)

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток, подождите' },
  })

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 80,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов' },
  })

  app.use('/api', apiLimiter)
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })
  app.get('/api/crypto/public-key', (_req, res) => {
    res.json({ jwk: getPublicJwk() })
  })
  app.use('/api/auth', authLimiter, authRouter)
  app.use('/api', profileRouter)

  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message || 'Проверьте введённые данные'
      next(new AppError(400, message))
      return
    }
    if (error instanceof multer.MulterError) {
      next(
        new AppError(
          400,
          error.code === 'LIMIT_FILE_SIZE' ? 'Файл больше 2 МБ' : 'Не удалось загрузить файл',
        ),
      )
      return
    }
    errorHandler(error, req, res, next)
  })

  app.listen(PORT, '127.0.0.1', () => {
    console.info(`API http://127.0.0.1:${PORT} (${isProd ? 'prod' : 'dev'})`)
    console.info(`DB ${DATA_DIR}`)
  })
}
