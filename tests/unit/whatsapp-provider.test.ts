import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildOwnerOrderMessage } from '@/server/notifications/build-owner-message';
import {
  createNotificationProviderFromEnv,
  OWNER_ORDER_TEMPLATE_CONTRACT_VERSION,
} from '@/server/notifications/provider';

const databaseEnv = {
  NODE_ENV: 'test' as const,
  DATABASE_URL: 'postgresql://guteli:guteli@127.0.0.1:55433/guteli_test',
};

const readyEnv = {
  ...databaseEnv,
  WHATSAPP_NOTIFICATIONS_ENABLED: 'true',
  WHATSAPP_ACCOUNT_READY: 'true',
  WHATSAPP_OWNER_CONSENT_CONFIRMED: 'true',
  WHATSAPP_TEMPLATE_CONTRACT_ACK: OWNER_ORDER_TEMPLATE_CONTRACT_VERSION,
  WHATSAPP_API_BASE_URL: 'https://graph.facebook.com',
  WHATSAPP_API_VERSION: 'v99.0',
  WHATSAPP_PHONE_NUMBER_ID: '1234567890',
  WHATSAPP_ACCESS_TOKEN: 'synthetic-access-token-never-live',
  OWNER_WHATSAPP_DESTINATION: '50255550199',
  WHATSAPP_APPROVED_TEMPLATE_NAME: 'guteli_owner_order_created_v1',
  WHATSAPP_APPROVED_TEMPLATE_LANGUAGE: 'es_GT',
  WHATSAPP_APP_SECRET: 'synthetic-app-secret-never-live',
  WHATSAPP_VERIFY_TOKEN: 'synthetic-verify-token-never-live',
  PUBLIC_ADMIN_BASE_URL: 'https://admin.guteli.test',
};

const message = buildOwnerOrderMessage(
  {
    publicId: 'GTL-20260916-001',
    customerName: 'Ana López',
    phone: '+502 4111 2233',
    fulfillment: 'DELIVERY',
    deliveryLocation: 'Zona 10, edificio 1, apartamento 4',
    requestedDate: '2026-09-20',
    items: [{ productName: 'Pastel de chocolate', quantity: 2 }],
    subtotalMinor: 24000,
    shippingMinor: null,
    totalMinor: null,
    notes: 'Tocar el timbre',
  },
  { publicAdminBaseUrl: readyEnv.PUBLIC_ADMIN_BASE_URL },
);

function response(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('owner WhatsApp provider selection', () => {
  it('defaults disabled and makes zero network calls', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const provider = createNotificationProviderFromEnv(databaseEnv, {
      fetchImpl,
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'disabled',
      code: 'NOT_CONFIGURED',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ['missing account acknowledgement', { WHATSAPP_ACCOUNT_READY: undefined }],
    [
      'missing recipient consent',
      { WHATSAPP_OWNER_CONSENT_CONFIRMED: undefined },
    ],
    [
      'wrong contract acknowledgement',
      { WHATSAPP_TEMPLATE_CONTRACT_ACK: 'v0' },
    ],
    ['missing token', { WHATSAPP_ACCESS_TOKEN: undefined }],
    ['invalid destination', { OWNER_WHATSAPP_DESTINATION: '+502 5555 0199' }],
    ['unsafe API base', { WHATSAPP_API_BASE_URL: 'https://example.com' }],
  ])('stays disabled for %s', async (_label, overrides) => {
    const fetchImpl = vi.fn<typeof fetch>();
    const provider = createNotificationProviderFromEnv(
      { ...readyEnv, ...overrides },
      { fetchImpl },
    );

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'disabled',
      code: 'NOT_CONFIGURED',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('Meta owner WhatsApp adapter', () => {
  it('accepts only a 2xx response with a documented wamid and uses the server destination', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        response('{"messages":[{"id":"wamid.synthetic-accepted"}]}', 200),
      );
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'accepted',
      code: 'PROVIDER_ACCEPTED',
      providerMessageId: 'wamid.synthetic-accepted',
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v99.0/1234567890/messages');
    expect(init?.redirect).toBe('manual');
    expect(init?.headers).toEqual({
      authorization: 'Bearer synthetic-access-token-never-live',
      'content-type': 'application/json',
    });
    const payload = JSON.parse(String(init?.body));
    expect(payload.to).toBe('50255550199');
    expect(payload.to).not.toBe('+502 4111 2233');
    expect(payload).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '50255550199',
      type: 'template',
      template: {
        name: 'guteli_owner_order_created_v1',
        language: { code: 'es_GT' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: message.bodyText }],
          },
        ],
      },
    });
  });

  it.each([
    [429, 'PROVIDER_RATE_LIMITED'],
    [500, 'PROVIDER_UNAVAILABLE'],
    [503, 'PROVIDER_UNAVAILABLE'],
  ])('maps HTTP %i to a retryable safe code', async (status, code) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response('{"secret":"50255550199"}', status));
    const logs: unknown[] = [];
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
      log: (entry) => logs.push(entry),
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'retryable_failure',
      code,
    });
    expect(JSON.stringify(logs)).not.toContain('50255550199');
    expect(JSON.stringify(logs)).not.toContain('synthetic-access-token');
  });

  it('maps nonretryable 4xx without logging provider bodies or customer data', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        response(
          '{"error":{"message":"token synthetic-access-token-never-live for +502 4111 2233"}}',
          400,
        ),
      );
    const logs: unknown[] = [];
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
      log: (entry) => logs.push(entry),
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'permanent_failure',
      code: 'PROVIDER_REQUEST_REJECTED',
    });
    expect(logs).toEqual([
      {
        event: 'owner_whatsapp_send_failed',
        code: 'PROVIDER_REQUEST_REJECTED',
        status: 400,
      },
    ]);
    expect(JSON.stringify(logs)).not.toContain('+502 4111 2233');
    expect(JSON.stringify(logs)).not.toContain('synthetic-access-token');
  });

  it.each([
    ['not-json', 'PROVIDER_INVALID_RESPONSE'],
    ['{}', 'PROVIDER_INVALID_RESPONSE'],
    ['{"messages":[]}', 'PROVIDER_INVALID_RESPONSE'],
    ['{"messages":[{"id":"wamid."}]}', 'PROVIDER_INVALID_RESPONSE'],
    ['{"messages":[{"id":"not-a-wamid"}]}', 'PROVIDER_INVALID_RESPONSE'],
  ])('does not accept malformed or empty 2xx body %s', async (body, code) => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response(body, 200));
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'retryable_failure',
      code,
    });
  });

  it('bounds oversized response bodies', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response('x'.repeat(65), 200));
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
      maxResponseBytes: 64,
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'retryable_failure',
      code: 'PROVIDER_INVALID_RESPONSE',
    });
  });

  it('blocks redirects rather than forwarding credentials', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response('', 302));
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'permanent_failure',
      code: 'PROVIDER_REDIRECT_BLOCKED',
    });
    expect(fetchImpl.mock.calls[0][1]?.redirect).toBe('manual');
  });

  it('rejects a forged admin link before making a provider call', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        response('{"messages":[{"id":"wamid.must-not-send"}]}', 200),
      );
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
    });

    await expect(
      provider.sendOwnerOrderCreated({
        ...message,
        adminOrderUrl: 'https://attacker.example/steal',
      }),
    ).resolves.toEqual({
      kind: 'permanent_failure',
      code: 'PAYLOAD_UNREPRESENTABLE',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('bounds a connection timeout and redacts the raw exception', async () => {
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(
            new DOMException(
              'timeout for +502 4111 2233 with synthetic-access-token-never-live',
              'AbortError',
            ),
          );
        });
      });
    });
    const logs: unknown[] = [];
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
      connectTimeoutMs: 5,
      log: (entry) => logs.push(entry),
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'retryable_failure',
      code: 'PROVIDER_TIMEOUT',
    });
    expect(JSON.stringify(logs)).not.toContain('+502 4111 2233');
    expect(JSON.stringify(logs)).not.toContain('synthetic-access-token');
  });

  it('bounds a transport that ignores the abort signal', async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => new Promise(() => undefined));
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
      connectTimeoutMs: 5,
    });

    const result = await Promise.race([
      provider.sendOwnerOrderCreated(message),
      new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), 30)),
    ]);
    expect(result).toEqual({
      kind: 'retryable_failure',
      code: 'PROVIDER_TIMEOUT',
    });
  });

  it('maps a network exception without retaining its sensitive text', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(
        new Error(
          'network for +502 4111 2233 with synthetic-access-token-never-live',
        ),
      );
    const logs: unknown[] = [];
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
      log: (entry) => logs.push(entry),
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'retryable_failure',
      code: 'PROVIDER_NETWORK_ERROR',
    });
    expect(logs).toEqual([
      {
        event: 'owner_whatsapp_send_failed',
        code: 'PROVIDER_NETWORK_ERROR',
      },
    ]);
    expect(JSON.stringify(logs)).not.toContain('+502 4111 2233');
    expect(JSON.stringify(logs)).not.toContain('synthetic-access-token');
  });

  it('bounds a stalled response body', async () => {
    const stalledBody = new ReadableStream<Uint8Array>({
      pull() {
        return new Promise(() => undefined);
      },
    });
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(stalledBody, { status: 200 }));
    const provider = createNotificationProviderFromEnv(readyEnv, {
      fetchImpl,
      responseTimeoutMs: 5,
    });

    await expect(provider.sendOwnerOrderCreated(message)).resolves.toEqual({
      kind: 'retryable_failure',
      code: 'PROVIDER_TIMEOUT',
    });
  });
});
