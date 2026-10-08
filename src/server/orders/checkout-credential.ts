import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

// Matches the existing order idempotency window; it is not a quote/payment expiry.
export const CHECKOUT_RECOVERY_SECONDS = 24 * 60 * 60;

export function checkoutCookieName(secure: boolean) {
  return secure ? '__Host-guteli-checkout' : 'guteli-checkout';
}

function signature(value: string, secret: string) {
  if (Buffer.byteLength(secret, 'utf8') < 32)
    throw new Error('Invalid checkout configuration');
  return createHmac('sha256', secret)
    .update(`guteli:checkout-recovery:v1\0${value}`)
    .digest('base64url');
}

export function issueCheckoutCredential(secret: string, now: Date) {
  const key = randomUUID();
  const payload = `${key}.${Math.floor(now.getTime() / 1000) + CHECKOUT_RECOVERY_SECONDS}`;
  return { key, value: `${payload}.${signature(payload, secret)}` };
}

export function readCheckoutCredential(
  headers: Headers,
  secret: string,
  now: Date,
  secure: boolean,
) {
  const name = checkoutCookieName(secure);
  const values = (headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  const match = /^([a-f0-9-]{36})\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match) return null;
  const [, key, expires, supplied] = match;
  const expected = signature(`${key}.${expires}`, secret);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)))
    return null;
  const seconds = Math.floor(now.getTime() / 1000);
  if (
    Number(expires) <= seconds ||
    Number(expires) > seconds + CHECKOUT_RECOVERY_SECONDS
  )
    return null;
  return { key, value };
}
