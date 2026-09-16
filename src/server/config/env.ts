import 'server-only';

import { z } from 'zod';

import { resolveUploadsRoot, uploadsRootValueSchema } from './uploads-root';

const disabledByDefaultFlag = z.preprocess(
  (value) => value === 'true',
  z.boolean(),
);

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  UPLOADS_ROOT: uploadsRootValueSchema.optional(),
  WHATSAPP_NOTIFICATIONS_ENABLED: disabledByDefaultFlag,
  PAYMENTS_ENABLED: disabledByDefaultFlag,
  WHATSAPP_ACCOUNT_READY: disabledByDefaultFlag,
  WHATSAPP_OWNER_CONSENT_CONFIRMED: disabledByDefaultFlag,
  WHATSAPP_TEMPLATE_CONTRACT_ACK: z.string().optional(),
  WHATSAPP_API_BASE_URL: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  OWNER_WHATSAPP_DESTINATION: z.string().optional(),
  WHATSAPP_APPROVED_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_APPROVED_TEMPLATE_LANGUAGE: z.string().optional(),
  WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  PUBLIC_ADMIN_BASE_URL: z.string().optional(),
});

export function parseServerEnv(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error('Invalid server environment');
  }

  return result.data;
}

export const getServerEnv = () => parseServerEnv(process.env);

export function getUploadsRoot(env: NodeJS.ProcessEnv = process.env) {
  return resolveUploadsRoot(env);
}
