import 'server-only';

import { isAbsolute, resolve } from 'node:path';
import { parseServerEnv } from './env';
import { parseOrderSecuritySettings } from './order-security-env';
import { isNetlify } from './platform';

function isNonPlaceholderSecret(value: string | undefined): value is string {
  return (
    typeof value === 'string' &&
    Buffer.byteLength(value, 'utf8') >= 32 &&
    new Set(value).size >= 12 &&
    !/(?:build-only|test[-_ ]|placeholder|replace[-_ ]|change[-_ ]?me)/i.test(
      value,
    )
  );
}

/** Configuration preflight only; does not establish TLS, firewall or storage durability. */
export function validateProductionRuntime(input: NodeJS.ProcessEnv) {
  try {
    const settings = parseServerEnv(input);
    const security = parseOrderSecuritySettings(input);
    const secrets = [
      input.BETTER_AUTH_SECRET,
      security.rateLimitSecret,
      security.receiptTokenSecret,
    ];
    if (
      settings.NODE_ENV !== 'production' ||
      !secrets.every(isNonPlaceholderSecret) ||
      new Set(secrets).size !== secrets.length
    )
      throw new Error();
    const database = new URL(settings.DATABASE_URL);
    const password = decodeURIComponent(database.password);
    const netlify = isNetlify(input);
    if (
      !database.username ||
      !(netlify
        ? password.length >= 16 &&
          new Set(password).size >= 8 &&
          !/(?:placeholder|replace|password)/i.test(password)
        : isNonPlaceholderSecret(password)) ||
      secrets.includes(password)
    )
      throw new Error();
    const origin = new URL(input.BETTER_AUTH_URL ?? '');
    if (
      origin.protocol !== 'https:' ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      origin.hostname === 'localhost' ||
      origin.hostname.endsWith('.localhost') ||
      origin.hostname.endsWith('.local') ||
      /^(?:127\.|0\.0\.0\.0$|\[::1\]$)/.test(origin.hostname)
    )
      throw new Error();
    if (
      !netlify &&
      (!input.TRUSTED_PROXY_HOPS ||
        !settings.UPLOADS_ROOT ||
        !isAbsolute(settings.UPLOADS_ROOT) ||
        resolve(settings.UPLOADS_ROOT) === '/')
    )
      throw new Error();
    if (netlify) {
      if (
        input.STORAGE_PROVIDER !== 'netlify-blobs' ||
        !/^ep-[a-z0-9-]+-pooler\.[a-z0-9.-]+\.neon\.tech$/.test(
          database.hostname,
        ) ||
        !['require', 'verify-full'].includes(
          database.searchParams.get('sslmode') ?? '',
        ) ||
        database.searchParams.get('uselibpqcompat') === 'true' ||
        input.COMMERCIAL_ORDERS_ENABLED !== 'false' ||
        input.NEXT_PUBLIC_DEMO_MODE !== 'true' ||
        [
          'DELIVERY_MAPS_ENABLED',
          'DELIVERY_PROVIDER_APPROVED',
          'DELIVERY_COVERAGE_ENABLED',
        ].some((key) => input[key] !== 'false')
      )
        throw new Error();
    }
    // This release has no verified payment provider or deployed notification worker.
    if (
      input.PAYMENTS_ENABLED !== 'false' ||
      input.WHATSAPP_NOTIFICATIONS_ENABLED !== 'false'
    )
      throw new Error();
    return {
      origin: origin.origin,
      uploadsRoot: netlify ? null : resolve(settings.UPLOADS_ROOT!),
      trustedProxyHops: security.trustedProxyHops,
      paymentsEnabled: false as const,
      notificationsEnabled: false as const,
    };
  } catch {
    // Never print Zod input, URLs, passwords, paths or provider credentials.
    throw new Error('Invalid production runtime configuration');
  }
}
