import 'server-only';

import { z } from 'zod';

import { parseServerEnv } from '@/server/config/env';

import { DisabledNotificationProvider } from './disabled-provider';
import {
  MetaWhatsAppProvider,
  type MetaWhatsAppProviderOptions,
} from './meta-whatsapp-provider';
import {
  OWNER_ORDER_TEMPLATE_CONTRACT_VERSION,
  type NotificationProvider,
} from './types';

export { OWNER_ORDER_TEMPLATE_CONTRACT_VERSION } from './types';

const metaApiBaseSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'graph.facebook.com' &&
      url.port === '' &&
      url.pathname.replace(/\/+$/, '') === '' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  });

const publicAdminBaseSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  });

const externallyVerifiedTemplateBodyMaximumSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .refine(Number.isSafeInteger)
  .refine((value) => value <= 65_536);

const enabledSettingsSchema = z.object({
  WHATSAPP_NOTIFICATIONS_ENABLED: z.literal(true),
  WHATSAPP_ACCOUNT_READY: z.literal(true),
  WHATSAPP_OWNER_CONSENT_CONFIRMED: z.literal(true),
  WHATSAPP_TEMPLATE_CONTRACT_ACK: z.literal(
    OWNER_ORDER_TEMPLATE_CONTRACT_VERSION,
  ),
  WHATSAPP_API_BASE_URL: metaApiBaseSchema,
  WHATSAPP_API_VERSION: z.string().regex(/^v[1-9]\d*\.\d+$/),
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  OWNER_WHATSAPP_DESTINATION: z.string().regex(/^\d{8,15}$/),
  WHATSAPP_APPROVED_TEMPLATE_NAME: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .min(1),
  WHATSAPP_APPROVED_TEMPLATE_LANGUAGE: z
    .string()
    .regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/),
  WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS:
    externallyVerifiedTemplateBodyMaximumSchema,
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  PUBLIC_ADMIN_BASE_URL: publicAdminBaseSchema,
});

export function createNotificationProviderFromEnv(
  input: NodeJS.ProcessEnv,
  options: MetaWhatsAppProviderOptions = {},
): NotificationProvider {
  const env = parseServerEnv(input);
  if (!env.WHATSAPP_NOTIFICATIONS_ENABLED) {
    return new DisabledNotificationProvider();
  }

  const readiness = enabledSettingsSchema.safeParse(env);
  if (!readiness.success) {
    return new DisabledNotificationProvider();
  }

  return new MetaWhatsAppProvider(
    {
      apiBaseUrl: readiness.data.WHATSAPP_API_BASE_URL.replace(/\/+$/, ''),
      apiVersion: readiness.data.WHATSAPP_API_VERSION,
      phoneNumberId: readiness.data.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: readiness.data.WHATSAPP_ACCESS_TOKEN,
      ownerDestination: readiness.data.OWNER_WHATSAPP_DESTINATION,
      templateName: readiness.data.WHATSAPP_APPROVED_TEMPLATE_NAME,
      templateLanguage: readiness.data.WHATSAPP_APPROVED_TEMPLATE_LANGUAGE,
      templateBodyMaxCharacters:
        readiness.data.WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS,
      publicAdminBaseUrl: readiness.data.PUBLIC_ADMIN_BASE_URL,
    },
    options,
  );
}

export function getNotificationProvider(): NotificationProvider {
  return createNotificationProviderFromEnv(process.env);
}
