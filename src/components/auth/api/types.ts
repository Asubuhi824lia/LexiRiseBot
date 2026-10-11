export type AuthMode = 'login' | 'register'
export type AuthIdentifier = 'login' | 'email'
export type AuthChannel = 'email' | 'totp'

export type ChallengeResponse = {
  challengeId: string
  channel: AuthChannel
  hasEmail: boolean
  needsTotpEnroll: boolean
  hint?: string
  retryAfterSec?: number
  otpauthUrl?: string
  totpSecret?: string
  generatedLogin?: string
}
