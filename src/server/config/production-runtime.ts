import 'server-only';

import { isAbsolute, resolve } from 'node:path';
import { parseServerEnv } from './env';
import { parseOrderSecuritySettings } from './order-security-env';

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
    if (
      !database.username ||
      !isNonPlaceholderSecret(password) ||
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
      !input.TRUSTED_PROXY_HOPS ||
      !settings.UPLOADS_ROOT ||
      !isAbsolute(settings.UPLOADS_ROOT) ||
      resolve(settings.UPLOADS_ROOT) === '/'
    )
      throw new Error();
    // This release has no verified payment provider or deployed notification worker.
    if (
      input.PAYMENTS_ENABLED !== 'false' ||
      input.WHATSAPP_NOTIFICATIONS_ENABLED !== 'false'
    )
      throw new Error();
    return {
      origin: origin.origin,
      uploadsRoot: resolve(settings.UPLOADS_ROOT),
      trustedProxyHops: security.trustedProxyHops,
      paymentsEnabled: false as const,
      notificationsEnabled: false as const,
    };
  } catch {
    // Never print Zod input, URLs, passwords, paths or provider credentials.
    throw new Error('Invalid production runtime configuration');
  }
}
