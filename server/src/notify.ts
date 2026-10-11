import { persistDevOtp } from './otp.ts'

export function sendEmailCode(to: string, code: string) {
  persistDevOtp(to, code)
}
