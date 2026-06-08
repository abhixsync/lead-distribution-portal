import { SignJWT, jwtVerify } from 'jose'

const JWT_EXPIRY = '8h'
const JWT_ALG = 'HS256'

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return new TextEncoder().encode(secret)
}

export interface JWTPayload {
  sub: string
  role: 'admin'
}

/**
 * Signs a new admin JWT token.
 * Uses HS256 algorithm with the JWT_SECRET env var.
 * jose is used instead of jsonwebtoken because Next.js middleware
 * runs on the Edge Runtime which does not support Node.js crypto APIs.
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret())
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws if the token is invalid or expired.
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: [JWT_ALG],
  })
  return payload as unknown as JWTPayload
}
