import { api } from './client.ts'

export async function logout() {
  await api<void>('/api/auth/logout', { method: 'POST' })
}
