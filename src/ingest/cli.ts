import { createDb } from '../db/client.js';
import { LivePortalClient } from './live-portal-client.js';
import { syncCounty } from './sync.js';
import { COASTAL_COUNTIES } from './counties.js';

async function main() {
  const dbPath = process.env.DB_PATH ?? './data/app.db';
  const countiesEnv = process.env.COASTAL_COUNTIES;
  const requested = process.argv[2]
    ? [process.argv[2].toUpperCase()]
    : countiesEnv
      ? countiesEnv.split(',').map((c) => c.trim().toUpperCase())
      : COASTAL_COUNTIES;

  const { db } = createDb(dbPath);
  const client = new LivePortalClient();

  for (const county of requested) {
    console.log(`[sync] starting county=${county}`);
    const result = await syncCounty(db, client, county);
    console.log(`[sync] done county=${county}`, JSON.stringify(result));
  }
}

main().catch((err) => {
  console.error('[sync] fatal error:', err);
  process.exitCode = 1;
});
