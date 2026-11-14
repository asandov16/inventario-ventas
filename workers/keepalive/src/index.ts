/* eslint-disable no-console -- this program reports only through its logs (Cloudflare / CI). */
import { pingAll, targetsFromEnv } from './keepalive';

interface ScheduledController {
  cron: string;
}

/** Cloudflare Worker entry: runs on the Cron Trigger in wrangler.toml. */
export default {
  async scheduled(_controller: ScheduledController, env: Record<string, string | undefined>) {
    const targets = targetsFromEnv(env);
    if (targets.length === 0) throw new Error('keepalive: no Supabase targets configured');
    const results = await pingAll(targets, fetch);
    for (const result of results) {
      console.log(`keepalive ${result.name}: ${String(result.status)} via ${result.via}`);
    }
    const failed = results.filter((result) => !result.ok).map((result) => result.name);
    // A thrown error marks the cron run as failed in the Cloudflare dashboard.
    if (failed.length > 0) throw new Error(`keepalive failed for: ${failed.join(', ')}`);
  },
};
