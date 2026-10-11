import type { ChallengeResponse } from '../api/types.ts'

export type LoginValues = {
  login: string
  password: string
}

export type EmailValues = {
  email: string
  password: string
}

export type EmailCodeValues = {
  email: string
  code: string
}

type FirstStepBase = {
  mode: 'login' | 'register'
  isStartAuthStepPending: boolean
}

export type FirstStepProps = FirstStepBase &
  (
    | {
        identifier: 'login'
        /** Сабмит шага 1: логин и пароль, открывает challenge. */
        onSubmit: (values: LoginValues) => void
      }
    | {
        identifier: 'email'
        /** Сабмит шага 1: почта и пароль, открывает challenge. */
        onSubmit: (values: EmailValues) => void
      }
  )

export type SecondEmailStepProps = {
  challenge: ChallengeResponse
  needsEmailInput: boolean
  cooldown: number
  isVerifyAuthStepPending: boolean
  isResendAuthPending: boolean
  isSetAuthFactorStepPending: boolean
  /** Сабмит шага 2: проверяет код с почты и завершает вход или регистрацию. */
  onVerify: (code: string) => void
  /** Повторно отправляет email-код, если ещё не истёк cooldown. */
  onResend: () => void
  /** Сабмит шага 2, когда ещё нужно ввести почту: отправляет код на указанный адрес. */
  onSendEmail: (email: string) => void
  /** Переключает шаг 2 на код из приложения (TOTP). */
  onSwitchTotp: () => void
  /** Возвращает на шаг 1 и сбрасывает challenge. */
  onBack: () => void
}

export type SecondTotpStepProps = {
  challenge: ChallengeResponse
  isVerifyAuthStepPending: boolean
  isSetAuthFactorStepPending: boolean
  /** Сабмит шага 2: проверяет код из приложения и завершает вход или регистрацию. */
  onVerify: (code: string) => void
  /** Переключает шаг 2 на почту: сразу шлёт код или сначала собирает адрес. */
  onSwitchEmail: () => void
  /** Возвращает на шаг 1 и сбрасывает challenge. */
  onBack: () => void
}
