import { Hono } from 'hono';
import { createDb, type AppDb } from './db/client.js';
import { authRoutes } from './auth/routes.js';
import { requireAuth } from './auth/middleware.js';
import { facilitiesRoutes } from './routes/facilities.js';
import { adminRoutes } from './routes/admin.js';
import type { PortalClient } from './ingest/portal-client.js';
import { LivePortalClient } from './ingest/live-portal-client.js';

export function buildApp(dbPath: string, makePortalClient: () => PortalClient = () => new LivePortalClient()) {
  const { db, sqlite } = createDb(dbPath);
  const getDb = (): AppDb => db;

  const app = new Hono();

  app.get('/healthz', (c) => c.json({ status: 'ok' }));

  app.route('/auth', authRoutes(getDb));

  const protectedApp = new Hono();
  protectedApp.use('*', requireAuth(getDb));
  protectedApp.route('/', facilitiesRoutes(getDb));
  protectedApp.route('/admin', adminRoutes(getDb, makePortalClient));
  app.route('/', protectedApp);

  return { app, db, sqlite };
}
