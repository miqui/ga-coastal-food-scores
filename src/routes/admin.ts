import { Hono } from 'hono';
import { requireAdmin } from '../auth/middleware.js';
import { syncCounty } from '../ingest/sync.js';
import { LivePortalClient } from '../ingest/live-portal-client.js';
import type { PortalClient } from '../ingest/portal-client.js';
import { COASTAL_COUNTIES } from '../ingest/counties.js';
import type { AppDb } from '../db/client.js';

export function adminRoutes(getDb: () => AppDb, makeClient: () => PortalClient = () => new LivePortalClient()) {
  const app = new Hono();

  app.post('/sync', requireAdmin(), async (c) => {
    const db = getDb();
    const client = makeClient();
    const body = await c.req.json().catch(() => ({}) as { county?: string });
    const county = body?.county?.toUpperCase();
    const counties = county ? [county] : COASTAL_COUNTIES;

    // Fire-and-forget async run; respond 202 immediately per spec.
    void (async () => {
      for (const cnty of counties) {
        try {
          await syncCounty(db, client, cnty);
        } catch (err) {
          console.error(`[admin/sync] county=${cnty} failed:`, err);
        }
      }
    })();

    return c.json({ status: 'accepted', counties }, 202);
  });

  return app;
}
