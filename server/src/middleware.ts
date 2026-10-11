import type { NextFunction, Request, Response } from 'express'
import { COOKIE_NAME, REQUEST_HEADER } from './config.ts'
import { AppError } from './errors.ts'
import { userFromToken } from './session.ts'
import type { UserRow } from './db.ts'

export type AuthedRequest = Request & { user: UserRow }

export function requireCustomHeader(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next()
    return
  }
  if (req.header('X-Requested-With') !== REQUEST_HEADER) {
    res.status(403).json({ error: 'Запрос отклонён' })
    return
  }
  next()
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = userFromToken(req.cookies?.[COOKIE_NAME])
  if (!user) {
    res.status(401).json({ error: 'Нужна авторизация' })
    return
  }
  ;(req as AuthedRequest).user = user
  next()
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message })
    return
  }

  if (typeof error === 'object' && error && 'status' in error && (error as { status?: number }).status === 413) {
    res.status(413).json({ error: 'Файл слишком большой' })
    return
  }

  console.error(error)
  res.status(500).json({ error: 'Сервис временно недоступен' })
}
