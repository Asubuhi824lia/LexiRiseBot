import { z } from 'zod'

const loginFieldSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{3,32}$/, 'Логин: 3–32 символа, латиница, цифры и _')

const emailFieldSchema = z
  .string()
  .trim()
  .pipe(z.email('Некорректный email'))

const passwordFieldSchema = z
  .string()
  .min(8, 'Пароль: 8–72 символа')
  .max(72, 'Пароль: 8–72 символа')

const otpFieldSchema = z.string().regex(/^\d{6}$/, 'Введите 6 цифр')

export const loginPasswordSchema = z.object({
  login: loginFieldSchema,
  password: passwordFieldSchema,
})

export const emailPasswordSchema = z.object({
  email: emailFieldSchema,
  password: passwordFieldSchema,
})

export const emailOnlySchema = z.object({
  email: emailFieldSchema,
})

export const otpCodeSchema = z.object({
  code: otpFieldSchema,
})

export function validateWithZod<T extends z.ZodType>(
  schema: T,
  values: z.input<T>,
): Partial<Record<string, string>> {
  const result = schema.safeParse(values)
  if (result.success) return {}

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && errors[key] === undefined) {
      errors[key] = issue.message
    }
  }
  return errors
}

export function fieldStatus(error?: string, touched?: boolean) {
  return error && touched ? 'error' : ''
}
