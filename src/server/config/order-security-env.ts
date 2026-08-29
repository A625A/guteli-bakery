import 'server-only';

import { z } from 'zod';

const MINIMUM_SECRET_BYTES = 32;
const MAX_TRUSTED_PROXY_HOPS = 10;

function hasMinimumSecretLength(value: string) {
  return Buffer.byteLength(value, 'utf8') >= MINIMUM_SECRET_BYTES;
}

const secretSchema = z.string().refine(hasMinimumSecretLength);

const schema = z.object({
  RATE_LIMIT_SECRET: secretSchema,
  RECEIPT_TOKEN_SECRET: secretSchema,
  TRUSTED_PROXY_HOPS: z
    .string()
    .regex(/^(0|[1-9]\d*)$/)
    .transform(Number)
    .refine((value) => value <= MAX_TRUSTED_PROXY_HOPS)
    .optional()
    .default(0),
});

export type OrderSecuritySettings = Readonly<{
  rateLimitSecret: string;
  receiptTokenSecret: string;
  trustedProxyHops: number;
}>;

export function parseOrderSecuritySettings(
  input: NodeJS.ProcessEnv,
): OrderSecuritySettings {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error('Invalid order security environment');
  }

  return {
    rateLimitSecret: result.data.RATE_LIMIT_SECRET,
    receiptTokenSecret: result.data.RECEIPT_TOKEN_SECRET,
    trustedProxyHops: result.data.TRUSTED_PROXY_HOPS,
  };
}

export function getOrderSecuritySettings(): OrderSecuritySettings {
  return parseOrderSecuritySettings(process.env);
}
