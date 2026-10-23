import { commercialOrdersEnabled } from '@/server/config/commerce';
import 'server-only';
import { z } from 'zod';
const template = z.string().regex(/^[a-z0-9_]{1,512}$/);
const secret = z.string().min(32);
const schema = z.object({
  WHATSAPP_NOTIFICATIONS_ENABLED: z.literal('true'),
  WHATSAPP_WEBHOOKS_ENABLED: z.literal('true'),
  WHATSAPP_AUTOMATION_AUTHORIZED: z.literal('true'),
  WHATSAPP_ACCOUNT_READY: z.literal('true'),
  WHATSAPP_OWNER_CONSENT_CONFIRMED: z.literal('true'),
  WHATSAPP_AUTOMATION_CONTRACT_ACK: z.literal('guteli-order-summary-v1'),
  WHATSAPP_API_VERSION: z.string().regex(/^v[1-9]\d*\.0$/),
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d{1,30}$/),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().regex(/^\d{1,30}$/),
  WHATSAPP_ACCESS_TOKEN: secret,
  WHATSAPP_APP_SECRET: secret,
  WHATSAPP_VERIFY_TOKEN: secret,
  OWNER_WHATSAPP_DESTINATION: z.string().regex(/^[1-9]\d{7,14}$/),
  WHATSAPP_CUSTOMER_ORDER_TEMPLATE: template,
  WHATSAPP_OWNER_ORDER_TEMPLATE: template,
  WHATSAPP_APPROVED_TEMPLATE_LANGUAGE: z
    .string()
    .regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/),
  WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(32768)),
  WHATSAPP_SEND_AFTER: z.string().datetime({ offset: true }),
  WHATSAPP_MAX_QUEUE_AGE_SECONDS: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(86400)),
});
export type AutomationSettings = z.infer<typeof schema>;
/** No configuration, no outbound request. Never logs invalid values or secrets. */
export function readAutomationSettings(
  env: NodeJS.ProcessEnv = process.env,
): AutomationSettings | null {
  if (!commercialOrdersEnabled(env)) return null;
  if (env.PAYMENTS_ENABLED === 'true') return null;
  const parsed = schema.safeParse(env);
  return parsed.success ? parsed.data : null;
}

const webhookSchema = schema
  .pick({
    WHATSAPP_APP_SECRET: true,
    WHATSAPP_VERIFY_TOKEN: true,
    WHATSAPP_PHONE_NUMBER_ID: true,
    WHATSAPP_BUSINESS_ACCOUNT_ID: true,
  })
  .extend({ WHATSAPP_WEBHOOKS_ENABLED: z.literal('true') });
export type WebhookSettings = z.infer<typeof webhookSchema>;
/** Keep callbacks/opt-outs available independently of the outbound kill switch. */
export function readWebhookSettings(
  env: NodeJS.ProcessEnv = process.env,
): WebhookSettings | null {
  const parsed = webhookSchema.safeParse(env);
  return parsed.success ? parsed.data : null;
}
