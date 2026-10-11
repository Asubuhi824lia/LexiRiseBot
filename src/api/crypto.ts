function bufToB64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function importPublicKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
}

export async function encryptPayload(jwk: JsonWebKey, payload: Record<string, unknown>) {
  const data = new TextEncoder().encode(JSON.stringify({ ...payload, ts: Date.now() }))
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data)
  const rawAes = await crypto.subtle.exportKey('raw', aesKey)
  const rsaKey = await importPublicKey(jwk)
  const wrappedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaKey, rawAes)

  return {
    wrappedKey: bufToB64(wrappedKey),
    iv: bufToB64(iv),
    ciphertext: bufToB64(ciphertext),
  }
}
