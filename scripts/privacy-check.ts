import { loadEnvConfig } from '@next/env';
import { asc, isNull } from 'drizzle-orm';
import { orders } from '../src/server/db/schema';
import { planRetentionBatch } from '../src/server/privacy/retention';

async function main() {
  if (
    process.argv.length > 2 &&
    process.argv.slice(2).join(' ') !== '--dry-run'
  )
    throw new Error('Only dry run is available.');
  loadEnvConfig(process.cwd(), false);
  const { db, pool } = await import('../src/server/db/client');
  try {
    // Metadata only. No customer fields, hashes, tokens or audit bodies are read.
    const rows = await db
      .select({
        id: orders.id,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        terminalAt: orders.terminalAt,
        anonymizedAt: orders.anonymizedAt,
      })
      .from(orders)
      .where(isNull(orders.anonymizedAt))
      .orderBy(asc(orders.id))
      .limit(100);
    const decisions = planRetentionBatch(rows, new Date());
    const counts: Record<string, number> = {};
    for (const row of decisions)
      counts[row.decision] = (counts[row.decision] ?? 0) + 1;
    console.log(
      JSON.stringify({
        mode: 'dry_run',
        executionEnabled: false,
        reviewed: rows.length,
        counts,
        notice:
          'Muestra de hasta 100 registros; sin cambios. Falta aprobación y revisión legal por pedido.',
      }),
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'No se pudo completar la revisión de conservación. No se ejecutó ninguna limpieza.',
  );
  process.exitCode = 1;
});
