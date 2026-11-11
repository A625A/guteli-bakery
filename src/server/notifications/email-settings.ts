import { z } from 'zod';
import { commercialOrdersEnabled } from '../config/commerce';

const address = z
  .email()
  .max(254)
  .refine((value) => !/[\r\n]/.test(value));
const schema = z.object({
  EMAIL_NOTIFICATIONS_ENABLED: z.literal('true'),
  EMAIL_PROVIDER_READY: z.literal('true'),
  EMAIL_TEST_CONFIRMED: z.literal('true'),
  EMAIL_PROVIDER: z.literal('resend'),
  RESEND_API_KEY: z.string().min(24).max(512),
  EMAIL_FROM: address.refine(
    (value) => !value.toLowerCase().endsWith('@resend.dev'),
  ),
  EMAIL_OWNER_TO: address,
  EMAIL_ADMIN_ORIGIN: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.pathname === '/' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  }),
  EMAIL_SEND_AFTER: z.iso.datetime({ offset: true }),
});
export type EmailSettings = z.infer<typeof schema>;

/** Explicit owner/provider readiness gates. Never infers addresses or enables delivery. */
export function readEmailSettings(
  env: Record<string, string | undefined> = process.env,
): EmailSettings | null {
  if (!commercialOrdersEnabled(env)) return null;
  const parsed = schema.safeParse(env);
  return parsed.success ? parsed.data : null;
}
