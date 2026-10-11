import { z } from 'zod'

export const loginSchema = z
  .string()
  .trim()
  .min(3, 'Логин слишком короткий')
  .max(32, 'Логин слишком длинный')
  .regex(/^[a-zA-Z0-9_]+$/, 'Логин: латиница, цифры и _')

export const emailSchema = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email('Некорректный email'))
  .transform((value) => value.toLowerCase())

export const passwordSchema = z
  .string()
  .min(8, 'Пароль слишком короткий')
  .max(72, 'Пароль слишком длинный')

export const otpSchema = z.string().regex(/^\d{6}$/, 'Код из 6 цифр')

export const envelopeSchema = z.object({
  wrappedKey: z.string().min(1).max(4096),
  iv: z.string().min(1).max(64),
  ciphertext: z.string().min(1).max(16_384),
})

export const authIdentifierSchema = z.enum(['login', 'email'])
export const authChannelSchema = z.enum(['email', 'totp'])

export const startPayloadSchema = z.object({
  mode: z.enum(['login', 'register']),
  identifier: authIdentifierSchema,
  password: z.string(),
  login: z.string().optional(),
  email: z.string().optional(),
})

export const factorPayloadSchema = z.object({
  challengeId: z.uuid(),
  channel: authChannelSchema,
  email: z.string().optional(),
})

export const verifyPayloadSchema = z.object({
  challengeId: z.uuid(),
  code: otpSchema,
})

export const resendPayloadSchema = z.object({
  challengeId: z.uuid(),
})

export const loginUpdateSchema = z.object({
  login: loginSchema,
})
