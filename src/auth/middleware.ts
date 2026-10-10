import type { Context, Next } from 'hono';
import { verifyAccessToken } from './jwt.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppDb } from '../db/client.js';

export interface AuthUser {
  id: number;
  email: string;
  role: 'viewer' | 'admin';
}

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser;
  }
}

export function requireAuth(getDb: () => AppDb) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'missing or malformed Authorization header' }, 401);
    }
    const token = header.slice('Bearer '.length).trim();
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      return c.json({ error: 'invalid or expired token' }, 401);
    }
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) {
      return c.json({ error: 'invalid token subject' }, 401);
    }
    const db = getDb();
    // Role is resolved fresh from the DB on every request (not from the JWT claims),
    // so revoking/downgrading a user takes effect immediately without needing to
    // invalidate already-issued tokens.
    const row = db.select().from(users).where(eq(users.id, userId)).get();
    if (!row) {
      return c.json({ error: 'user no longer exists' }, 401);
    }
    c.set('authUser', { id: row.id, email: row.email, role: row.role as 'viewer' | 'admin' });
    await next();
  };
}

export function requireAdmin() {
  return async (c: Context, next: Next) => {
    const authUser = c.get('authUser');
    if (!authUser || authUser.role !== 'admin') {
      return c.json({ error: 'admin role required' }, 403);
    }
    await next();
  };
}
