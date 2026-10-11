import { api, ApiError } from '../client.ts'
import { secureRequest } from '../secure.ts'
import type { User } from './types.ts'

export async function fetchUser(): Promise<User | null> {
  try {
    const data = await api<{ user: User }>('/api/user')
    return data.user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function updateLogin(login: string) {
  return secureRequest<{ user: User }>('/api/me/login', 'PATCH', { login })
}
