import { loadEnvConfig } from '@next/env';
import { readAutomationSettings } from '../src/server/notifications/automation-settings';
import { processNextWhatsAppEvent } from '../src/server/notifications/automation-worker';
import { recordWhatsAppOptOut } from '../src/server/notifications/delivery-receipts';
import { recordWorkerSignal } from '../src/server/operations/worker-signal';
import { logOperationalEvent } from '../src/server/observability/safe-log';

loadEnvConfig(process.cwd(), false);
async function main() {
  // Off-channel withdrawals are local operator actions, independent of sending flags.
  // Read the number from stdin, never command arguments or logs.
  const mode = process.argv.slice(2).join(' ');
  const optOut = mode === '--opt-out';
  const cleanup = mode === '--cleanup';
  if (!['', '--opt-out', '--cleanup'].includes(mode))
    throw new Error('Invalid arguments');
  if (cleanup) {
    logOperationalEvent('RETENTION_DISABLED');
    throw new Error(
      'La limpieza requiere una política aprobada. No se modificaron datos.',
    );
  }
  const settings = readAutomationSettings();
  if (!optOut && !cleanup && !settings) {
    console.log(
      'WhatsApp automático desactivado. No se intentó enviar mensajes.',
    );
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
      console.log('Se registró la solicitud de no recibir mensajes.');
      return;
    }
    for (let i = 0; i < 25; i++) {
      const result = await processNextWhatsAppEvent({ database: db, settings });
      if (result === 'IDLE' || result === 'DISABLED') break;
    }
    await recordWorkerSignal(db, 'ok');
    logOperationalEvent('WHATSAPP_BATCH_COMPLETE');
  } catch (error) {
    if (!optOut) await recordWorkerSignal(db, 'failed');
    throw error;
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  logOperationalEvent('WHATSAPP_WORKER_FAILED');
  process.exitCode = 1;
});
