import {
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  constants,
  type KeyObject,
} from 'node:crypto'
import { PAYLOAD_MAX_AGE_MS } from './config.ts'
import { AppError } from './errors.ts'

export type EncryptedEnvelope = {
  wrappedKey: string
  iv: string
  ciphertext: string
}

let privateKey: KeyObject
let publicJwk: JsonWebKey

export function initCrypto() {
  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001,
  })
  privateKey = pair.privateKey
  publicJwk = pair.publicKey.export({ format: 'jwk' })
}

export function getPublicJwk() {
  return {
    ...publicJwk,
    alg: 'RSA-OAEP-256',
    key_ops: ['encrypt'],
    ext: true,
  }
}

export function decryptEnvelope(envelope: EncryptedEnvelope): Record<string, unknown> {
  try {
    const wrappedKey = Buffer.from(envelope.wrappedKey, 'base64')
    const iv = Buffer.from(envelope.iv, 'base64')
    const packed = Buffer.from(envelope.ciphertext, 'base64')

    if (iv.length !== 12 || packed.length < 17) {
      throw new Error('bad-envelope')
    }

    const tag = packed.subarray(packed.length - 16)
    const ciphertext = packed.subarray(0, packed.length - 16)
    const aesKey = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      wrappedKey,
    )

    if (aesKey.length !== 32) {
      throw new Error('bad-key')
    }

    const decipher = createDecipheriv('aes-256-gcm', aesKey, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    const parsed = JSON.parse(plain.toString('utf8')) as Record<string, unknown>

    if (typeof parsed.ts !== 'number' || Math.abs(Date.now() - parsed.ts) > PAYLOAD_MAX_AGE_MS) {
      throw new AppError(400, 'Сессия шифрования устарела, обновите страницу')
    }

    return parsed
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(400, 'Не удалось расшифровать запрос')
  }
}
