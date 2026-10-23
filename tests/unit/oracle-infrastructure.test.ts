import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
const compose = parse(readFileSync('infra/oracle/compose.yaml', 'utf8'));
describe('Oracle preparation boundary', () => {
  it('only exposes the TLS edge; never PostgreSQL or Next.js', () => {
    expect(compose.services.app.ports).toBeUndefined();
    expect(compose.services.database.ports).toBeUndefined();
    expect(compose.services.proxy.ports).toEqual(['80:8080', '443:8443']);
    expect(compose.networks.backend.internal).toBe(true);
  });
  it('forces commercial switches off even when runtime env differs', () => {
    for (const flag of [
      'COMMERCIAL_ORDERS_ENABLED',
      'PAYMENTS_ENABLED',
      'WHATSAPP_NOTIFICATIONS_ENABLED',
      'WHATSAPP_WEBHOOKS_ENABLED',
    ])
      expect(compose.services.app.environment[flag]).toBe('false');
  });
  it('does not silently create missing bind directories', () => {
    for (const service of Object.values(compose.services) as {
      volumes: { type: string; bind: { create_host_path: boolean } }[];
    }[]) {
      for (const volume of service.volumes)
        expect(volume.bind.create_host_path).toBe(false);
    }
  });
});
