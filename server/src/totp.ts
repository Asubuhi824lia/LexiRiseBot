import { Secret, TOTP } from 'otpauth'

export function issueTotp(label: string) {
  const totp = new TOTP({
    issuer: 'LexiRiseBot',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })
  return {
    secret: totp.secret.base32,
    otpauthUrl: totp.toString(),
  }
}

export function totpAuthUrl(secret: string, label: string) {
  return new TOTP({
    issuer: 'LexiRiseBot',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  }).toString()
}

export function totpMatches(secret: string, token: string) {
  const totp = new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })
  return totp.validate({ token, window: 1 }) !== null
}
