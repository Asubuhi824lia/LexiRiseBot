import { api, ApiError } from './client.ts'
import { encryptPayload } from './crypto.ts'

let cachedJwk: JsonWebKey | null = null

async function publicKey() {
  if (cachedJwk) return cachedJwk
  const data = await api<{ jwk: JsonWebKey }>('/api/crypto/public-key')
  cachedJwk = data.jwk
  return data.jwk
}

export async function secureRequest<T>(
  path: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const send = async () => {
    const envelope = await encryptPayload(await publicKey(), payload)
    return api<T>(path, { method, body: JSON.stringify(envelope) })
  }

  try {
    return await send()
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.message.includes('расшифровать') || error.message.includes('устарела'))
    ) {
      cachedJwk = null
      return send()
    }
    throw error
  }
}
