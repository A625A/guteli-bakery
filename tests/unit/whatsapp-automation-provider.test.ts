import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { MetaWhatsAppProvider } from '@/server/notifications/meta-whatsapp-provider';
import { readAutomationSettings } from '@/server/notifications/automation-settings';
const settings = {
  apiBaseUrl: 'https://graph.facebook.com',
  apiVersion: 'v99.0',
  phoneNumberId: '123',
  accessToken: 'fixture-token',
  ownerDestination: '50255551234',
  templateName: 'order_received',
  templateLanguage: 'es',
  templateBodyMaxCharacters: 5000,
  publicAdminBaseUrl: 'https://example.test',
};
it('sends the complete body through an approved template to the selected recipient and reports acceptance only', async () => {
  const fetchImpl = vi.fn(async () =>
    Response.json({ messages: [{ id: 'wamid.test' }] }),
  );
  const result = await new MetaWhatsAppProvider(settings, {
    fetchImpl,
  }).sendOrderSummary('Pedido A | Total Q150 | Sin pago verificado');
  expect(result).toEqual({
    kind: 'accepted',
    code: 'PROVIDER_ACCEPTED',
    providerMessageId: 'wamid.test',
  });
  const [url, init] = fetchImpl.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe('https://graph.facebook.com/v99.0/123/messages');
  expect(init.redirect).toBe('manual');
  expect(JSON.parse(init.body as string)).toMatchObject({
    to: '50255551234',
    type: 'template',
    template: {
      name: 'order_received',
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: 'Pedido A | Total Q150 | Sin pago verificado',
            },
          ],
        },
      ],
    },
  });
});
it('rejects oversized or multiline template data without truncation or a network call', async () => {
  const fetchImpl = vi.fn();
  const provider = new MetaWhatsAppProvider(settings, { fetchImpl });
  expect(await provider.sendOrderSummary('x'.repeat(5001))).toMatchObject({
    code: 'PAYLOAD_UNREPRESENTABLE',
  });
  expect(await provider.sendOrderSummary('line1\nline2')).toMatchObject({
    code: 'PAYLOAD_UNREPRESENTABLE',
  });
  expect(fetchImpl).not.toHaveBeenCalled();
});
it('remains disabled with missing authorization, secrets or template approval', () => {
  expect(readAutomationSettings({ NODE_ENV: 'test' })).toBeNull();
  expect(
    readAutomationSettings({
      NODE_ENV: 'test',
      WHATSAPP_NOTIFICATIONS_ENABLED: 'true',
      WHATSAPP_AUTOMATION_AUTHORIZED: 'true',
    }),
  ).toBeNull();
});

import { automationSettings } from '../support/whatsapp-fixture';
import { readWebhookSettings } from '@/server/notifications/automation-settings';
import { notificationDeliveryLabel } from '@/lib/notification-status';
it('requires every activation gate and leaves callbacks independent of the sending kill switch', () => {
  const env = {
    NODE_ENV: 'test',
    ...Object.fromEntries(
      Object.entries(automationSettings(new Date())).map(([k, v]) => [
        k,
        String(v),
      ]),
    ),
  } as NodeJS.ProcessEnv;
  expect(readAutomationSettings(env)).not.toBeNull();
  for (const key of Object.keys(automationSettings(new Date()))) {
    const missing = { ...env };
    delete missing[key];
    expect(readAutomationSettings(missing), key).toBeNull();
  }
  expect(
    readAutomationSettings({ ...env, PAYMENTS_ENABLED: 'true' }),
  ).toBeNull();
  expect(
    readWebhookSettings({
      ...env,
      WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
      WHATSAPP_WEBHOOKS_ENABLED: 'true',
    }),
  ).not.toBeNull();
  expect(notificationDeliveryLabel('ACCEPTED')).toContain('entrega pendiente');
  expect(notificationDeliveryLabel('DELIVERED')).toBe('Entregada');
});

import { execFileSync } from 'node:child_process';
it('disabled operator command exits without opening even an invalid database or printing secrets', () => {
  const output = execFileSync(
    process.execPath,
    [
      '--conditions=react-server',
      '--import',
      'tsx',
      'scripts/whatsapp-worker.ts',
    ],
    {
      cwd: process.cwd(),
      timeout: 10000,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: 'not-a-database-url',
        WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
        WHATSAPP_AUTOMATION_AUTHORIZED: 'false',
        WHATSAPP_ACCESS_TOKEN: 'fixture-sensitive-value-must-not-be-logged',
      },
    },
  );
  expect(output).toContain('disabled; no sends attempted');
  expect(output).not.toContain('fixture-sensitive');
});
