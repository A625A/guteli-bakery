import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createWhatsAppWebhookHandlers } from '@/app/api/webhooks/whatsapp/route';
import { automationSettings } from '../support/whatsapp-fixture';
const handlers = () =>
  createWhatsAppWebhookHandlers({
    settings: {
      ...automationSettings(new Date()),
      WHATSAPP_WEBHOOKS_ENABLED: 'true',
    },
  });
it('bounds stalled unauthenticated request bodies without contacting a database', async () => {
  vi.useFakeTimers();
  try {
    const request = new Request('https://example.test/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'x-hub-signature-256': `sha256=${'a'.repeat(64)}` },
      body: new ReadableStream(),
      duplex: 'half',
    } as RequestInit);
    let status: number | undefined;
    void handlers()
      .POST(request)
      .then((r) => {
        status = r.status;
      });
    await vi.advanceTimersByTimeAsync(5001);
    expect(status).toBe(400);
  } finally {
    vi.useRealTimers();
  }
});
it('rejects oversized webhook bodies and stays disabled without webhook configuration', async () => {
  expect(
    (
      await handlers().POST(
        new Request('https://example.test', {
          method: 'POST',
          headers: { 'x-hub-signature-256': `sha256=${'a'.repeat(64)}` },
          body: 'x'.repeat(65537),
        }),
      )
    ).status,
  ).toBe(413);
  expect(
    (
      await createWhatsAppWebhookHandlers({ settings: null }).POST(
        new Request('https://example.test', { method: 'POST' }),
      )
    ).status,
  ).toBe(503);
});
