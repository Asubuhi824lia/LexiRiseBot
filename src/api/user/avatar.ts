import { api, ApiError } from '../client.ts'
import type { User } from './types.ts'

export async function uploadAvatar(file: File) {
  const body = new FormData()
  body.append('avatar', file)
  return api<{ user: User }>('/api/me/avatar', { method: 'POST', body })
}

export async function deleteAvatar() {
  return api<{ user: User }>('/api/me/avatar', { method: 'DELETE' })
}

export async function fetchAvatarObjectUrl() {
  const response = await fetch('/api/me/avatar', {
    credentials: 'include',
    headers: { 'X-Requested-With': 'LexiRiseBot' },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new ApiError(response.status, 'Не удалось получить аватар')
  return URL.createObjectURL(await response.blob())
}
