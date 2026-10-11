import type { User } from '../../../api/user/types.ts'
import { secureRequest } from '../../../api/secure.ts'
import type { AuthChannel, AuthIdentifier, AuthMode, ChallengeResponse } from './types.ts'

export async function startAuthStep(input: {
  mode: AuthMode
  identifier: AuthIdentifier
  password: string
  login?: string
  email?: string
}) {
  return secureRequest<ChallengeResponse>('/api/auth/start', 'POST', input)
}

export async function setAuthFactorStep(input: {
  challengeId: string
  channel: AuthChannel
  email?: string
}) {
  return secureRequest<ChallengeResponse>('/api/auth/factor', 'POST', input)
}

export async function verifyAuthStep(challengeId: string, code: string) {
  return secureRequest<{ user: User }>('/api/auth/verify', 'POST', { challengeId, code })
}

export async function resendAuth(challengeId: string) {
  return secureRequest<ChallengeResponse>('/api/auth/resend', 'POST', { challengeId })
}
