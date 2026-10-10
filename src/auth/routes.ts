import { Hono } from 'hono';
import { registerSchema, loginSchema } from './schemas.js';
import { hashPassword, verifyPassword } from './password.js';
import { signAccessToken } from './jwt.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AppDb } from '../db/client.js';

export function authRoutes(getDb: () => AppDb) {
  const app = new Hono();

  app.post('/register', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', details: parsed.error.flatten() }, 400);
    }
    // Any 'role' field present in the raw body is ignored entirely: role is
    // never derived from client input, only ever server-assigned as 'viewer'.
    const { email, password } = parsed.data;
    const db = getDb();
    const existing = db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      return c.json({ error: 'email already registered' }, 409);
    }
    const passwordHash = await hashPassword(password);
    const result = db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: 'viewer',
        createdAt: new Date().toISOString(),
      })
      .run();
    return c.json({ id: Number(result.lastInsertRowid), email, role: 'viewer' }, 201);
  });

  app.post('/login', async (c) => {
    const body = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'validation_error', details: parsed.error.flatten() }, 400);
    }
    const { email, password } = parsed.data;
    const db = getDb();
    const row = db.select().from(users).where(eq(users.email, email)).get();
    if (!row) {
      return c.json({ error: 'invalid credentials' }, 401);
    }
    const ok = await verifyPassword(password, row.passwordHash);
    if (!ok) {
      return c.json({ error: 'invalid credentials' }, 401);
    }
    const token = await signAccessToken(row.id, row.email);
    return c.json({ access_token: token, token_type: 'Bearer', expires_in: 900 });
  });

  return app;
}
