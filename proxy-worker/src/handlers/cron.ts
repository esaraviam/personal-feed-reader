import type { WorkerEnv } from '../types';
import { runIngestion } from '../pipeline/ingest';

const INGEST_CRON  = '*/30 * * * *';
const DIGEST_CRON  = '0 6 * * *';

/**
 * Scheduled event handler — dispatches to the appropriate pipeline job
 * based on which cron pattern fired.
 *
 * Cron schedule (defined in wrangler.toml):
 *   every-30-min  — RSS ingestion
 *   0 6 daily     — Daily digest build (06:00 UTC)
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<void> {
  console.log(`[cron] Triggered: ${event.cron} at ${new Date(event.scheduledTime).toISOString()}`);

  if (event.cron === INGEST_CRON) {
    ctx.waitUntil(
      runIngestion(env).catch((err) =>
        console.error('[cron] Ingestion failed:', err),
      ),
    );
    return;
  }

  if (event.cron === DIGEST_CRON) {
    // Phase 3: daily digest build — not yet implemented
    console.log('[cron] Daily digest build — scheduled for Phase 3.');
    return;
  }

  console.warn('[cron] Unknown cron pattern:', event.cron);
}
