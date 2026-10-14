import { loadEnvConfig } from '@next/env';
import { readAutomationSettings } from '../src/server/notifications/automation-settings';
import { processNextWhatsAppEvent } from '../src/server/notifications/automation-worker';
import { recordWhatsAppOptOut } from '../src/server/notifications/delivery-receipts';
import { whatsappDeliveryReceipts } from '../src/server/db/schema';
import { lt } from 'drizzle-orm';

loadEnvConfig(process.cwd(), false);
async function main() {
  // Off-channel withdrawals are local operator actions, independent of sending flags.
  // Read the number from stdin, never command arguments or logs.
  const mode = process.argv.slice(2).join(' ');
  const optOut = mode === '--opt-out';
  const cleanup = mode === '--cleanup';
  if (!['', '--opt-out', '--cleanup'].includes(mode))
    throw new Error('Invalid arguments');
  const settings = readAutomationSettings();
  if (!optOut && !cleanup && !settings) {
    console.log('WhatsApp automation disabled; no sends attempted.');
    return;
  }
  const { db, pool } = await import('../src/server/db/client');
  try {
    if (optOut) {
      let destination = '';
      for await (const chunk of process.stdin) {
        destination += String(chunk);
        if (destination.length > 32) throw new Error('Invalid destination');
      }
      await recordWhatsAppOptOut(db, destination.trim(), new Date());
      console.log('WhatsApp withdrawal recorded.');
      return;
    }
    if (cleanup) {
      await db
        .delete(whatsappDeliveryReceipts)
        .where(
          lt(
            whatsappDeliveryReceipts.receivedAt,
            new Date(Date.now() - 7 * 86400000),
          ),
        );
      console.log('Expired WhatsApp callback receipts removed.');
      return;
    }
    const counts: Record<string, number> = {};
    for (let i = 0; i < 25; i++) {
      const result = await processNextWhatsAppEvent({ database: db, settings });
      counts[result] = (counts[result] ?? 0) + 1;
      if (result === 'IDLE' || result === 'DISABLED') break;
    }
    // Minimal authenticated callback inbox is kept for at most seven days by the worker.
    await db
      .delete(whatsappDeliveryReceipts)
      .where(
        lt(
          whatsappDeliveryReceipts.receivedAt,
          new Date(Date.now() - 7 * 86400000),
        ),
      );
    console.log({ event: 'whatsapp_batch_complete', counts });
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'WhatsApp operation failed; no configuration or customer data logged.',
  );
  process.exitCode = 1;
});
