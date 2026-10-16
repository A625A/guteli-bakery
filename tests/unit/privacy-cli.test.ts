import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function run(script: string, argument: string) {
  return spawnSync(
    process.execPath,
    ['--conditions=react-server', '--import', 'tsx', script, argument],
    {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        DATABASE_URL: 'invalid-CANARY_SECRET',
        WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
        WHATSAPP_AUTOMATION_AUTHORIZED: 'false',
        PAYMENTS_ENABLED: 'false',
      },
    },
  );
}

it('rejects WhatsApp cleanup before loading the database or deleting receipts', () => {
  const result = run('scripts/whatsapp-worker.ts', '--cleanup');
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('RETENTION_DISABLED');
  expect(result.stdout + result.stderr).not.toContain('CANARY');
});

it('rejects privacy apply before loading database settings', () => {
  const result = run('scripts/privacy-check.ts', '--apply');
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('No se ejecutó ninguna limpieza.');
  expect(result.stdout + result.stderr).not.toContain('CANARY');
});

it('does not reveal an invalid database URL when starting the isolated test server', () => {
  const result = spawnSync(
    process.execPath,
    ['scripts/start-privacy-test.mjs'],
    {
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, DATABASE_URL_TEST: 'invalid-CANARY_SECRET' },
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    'Invalid privacy test database configuration.',
  );
  expect(result.stdout + result.stderr).not.toContain('CANARY');
});
