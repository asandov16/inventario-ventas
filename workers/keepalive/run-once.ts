/* eslint-disable no-console -- this program reports only through its logs (Cloudflare / CI). */
// Runs the same keep-alive once from Node (CI after deploying, or by hand).
// Reads STAGING_/PROD_SUPABASE_URL and _ANON_KEY from the environment; prints only statuses.
import { pingAll, targetsFromEnv } from './src/keepalive.ts';

const targets = targetsFromEnv(process.env);
if (targets.length === 0) {
  console.error('keepalive: no Supabase targets configured');
  process.exit(1);
}

const results = await pingAll(targets, fetch);
for (const result of results) {
  console.log(`keepalive ${result.name}: ${String(result.status)} via ${result.via}`);
}
if (results.some((result) => !result.ok)) process.exit(1);
