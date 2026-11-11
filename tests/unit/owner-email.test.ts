import { describe, expect, it, vi } from 'vitest';
import scheduledHandler from '../../netlify/functions/owner-order-email.mjs';
import { readEmailSettings } from '@/server/notifications/email-settings';
import {
  buildOwnerOrderEmail,
  type OwnerEmailSnapshot,
} from '@/server/notifications/email-message';
import { sendOwnerEmail } from '@/server/notifications/email-provider';

const env = {
  COMMERCIAL_ORDERS_ENABLED: 'true',
  EMAIL_NOTIFICATIONS_ENABLED: 'true',
  EMAIL_PROVIDER_READY: 'true',
  EMAIL_TEST_CONFIRMED: 'true',
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test-only-key-not-real-123456789',
  EMAIL_FROM: 'orders@bakery.example',
  EMAIL_OWNER_TO: 'owner@example.com',
  EMAIL_ADMIN_ORIGIN: 'https://bakery.example',
  EMAIL_SEND_AFTER: '2026-11-08T00:00:00-06:00',
};
const snapshot: OwnerEmailSnapshot = {
  publicId: 'GUT-26-EMAIL123',
  fulfillment: 'DELIVERY',
  requestedDate: '2099-01-01',
  paymentMethod: 'BANK_TRANSFER',
  subtotalMinor: 2500,
  shippingMinor: null,
  totalMinor: null,
  items: [{ productName: 'Pan de banano', quantity: 2, lineTotalMinor: 2500 }],
};

describe('owner backup email', () => {
  it('fails closed unless every business and provider gate is explicit', () => {
    expect(readEmailSettings({})).toBeNull();
    expect(readEmailSettings(env)).not.toBeNull();
    for (const key of Object.keys(env)) {
      const changed = { ...env, [key]: undefined };
      expect(readEmailSettings(changed), key).toBeNull();
    }
    expect(
      readEmailSettings({
        ...env,
        EMAIL_ADMIN_ORIGIN: 'https://evil.example/admin?token=secret',
      }),
    ).toBeNull();
    expect(
      readEmailSettings({ ...env, EMAIL_FROM: 'onboarding@resend.dev' }),
    ).toBeNull();
    expect(
      readEmailSettings({
        ...env,
        EMAIL_OWNER_TO: 'owner@example.com\r\nBcc: victim@example.com',
      }),
    ).toBeNull();
  });

  it('includes authoritative order data and an authenticated admin link without contact data or private links', () => {
    const message = buildOwnerOrderEmail(snapshot, 'https://bakery.example');
    expect(message.subject).toContain(snapshot.publicId);
    expect(message.text).toContain('Transferencia bancaria');
    expect(message.text).toContain('2 × Pan de banano');
    expect(message.text).toContain('Subtotal: Q25');
    expect(message.text).toContain('Total: por confirmar');
    expect(message.text).toContain(
      'https://bakery.example/admin/orders/GUT-26-EMAIL123/',
    );
    expect(message.text).toContain('panel administrativo');
    expect(message.text).not.toMatch(
      /receipt|token=|password|teléfono|dirección/i,
    );
  });

  it('uses fixed payload and provider idempotency; acceptance does not claim inbox delivery', async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ id: 'email-provider-id' }),
    );
    const payload = {
      from: env.EMAIL_FROM,
      to: [env.EMAIL_OWNER_TO],
      ...buildOwnerOrderEmail(snapshot, env.EMAIL_ADMIN_ORIGIN),
    };
    const result = await sendOwnerEmail({
      apiKey: env.RESEND_API_KEY,
      payload,
      idempotencyKey: 'email:order:test-id',
      fetchImpl,
    });
    expect(result).toEqual({
      kind: 'accepted',
      providerMessageId: 'email-provider-id',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({
          'Idempotency-Key': 'email:order:test-id',
        }),
      }),
    );
  });

  it.each([429, 500, 503])(
    'retries provider %s responses without storing raw provider errors',
    async (status) => {
      const result = await sendOwnerEmail({
        apiKey: env.RESEND_API_KEY,
        payload: {
          from: env.EMAIL_FROM,
          to: [env.EMAIL_OWNER_TO],
          subject: 'test',
          text: 'test',
        },
        idempotencyKey: 'email:test',
        fetchImpl: async () =>
          new Response('secret provider diagnostic', { status }),
      });
      expect(result).toMatchObject({
        kind: 'retryable',
        code:
          status === 429 ? 'EMAIL_RATE_LIMITED' : 'EMAIL_PROVIDER_UNAVAILABLE',
      });
      expect(JSON.stringify(result)).not.toContain('secret');
    },
  );

  it('tracks ambiguous network outcomes and permanent provider rejection safely', async () => {
    const input = {
      apiKey: env.RESEND_API_KEY,
      payload: {
        from: env.EMAIL_FROM,
        to: [env.EMAIL_OWNER_TO],
        subject: 'test',
        text: 'test',
      },
      idempotencyKey: 'email:test',
    };
    expect(
      await sendOwnerEmail({
        ...input,
        fetchImpl: async () => {
          throw new Error('secret');
        },
      }),
    ).toMatchObject({ kind: 'retryable', code: 'EMAIL_SEND_OUTCOME_UNKNOWN' });
    expect(
      await sendOwnerEmail({
        ...input,
        fetchImpl: async () => new Response('secret', { status: 403 }),
      }),
    ).toMatchObject({
      kind: 'permanent_failure',
      code: 'EMAIL_PROVIDER_REJECTED',
    });
  });
});

it('never sends from a preview, non-Netlify runtime, or incomplete production configuration', async () => {
  const fetchImpl = vi.spyOn(globalThis, 'fetch');
  try {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    vi.stubEnv('CONTEXT', 'deploy-preview');
    vi.stubEnv('DEPLOYMENT_PLATFORM', 'netlify');
    expect((await scheduledHandler()).status).toBe(204);
    vi.stubEnv('CONTEXT', 'production');
    vi.stubEnv('DEPLOYMENT_PLATFORM', 'oracle');
    expect((await scheduledHandler()).status).toBe(204);
    vi.stubEnv('DEPLOYMENT_PLATFORM', 'netlify');
    vi.stubEnv('EMAIL_TEST_CONFIRMED', 'false');
    expect((await scheduledHandler()).status).toBe(204);
    expect(fetchImpl).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllEnvs();
  }
});
