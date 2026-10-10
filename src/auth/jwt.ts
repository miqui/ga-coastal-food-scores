import { sign, verify } from 'hono/jwt';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  exp: number;
  iat: number;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set. Refusing to start.');
  }
  return secret;
}

export async function signAccessToken(userId: number, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AccessTokenPayload = {
    sub: String(userId),
    email,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  };
  return sign(payload as unknown as Record<string, unknown>, getSecret(), 'HS256');
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const payload = await verify(token, getSecret(), 'HS256');
  return payload as unknown as AccessTokenPayload;
}
