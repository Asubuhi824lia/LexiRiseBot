const REQUEST_HEADER = 'LexiRiseBot'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'X-Requested-With': REQUEST_HEADER,
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  })

  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as { error?: string })
    : undefined

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error || 'Ошибка запроса')
  }

  return payload as T
}
