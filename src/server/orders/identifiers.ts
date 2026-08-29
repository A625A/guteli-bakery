import { createHash, randomBytes } from 'node:crypto';

import { getGuatemalaDate } from '@/lib/date';

// The final underscore keeps this alphabet at 32 characters while avoiding
// the visually ambiguous 0, 1, I, L, and O characters.
export const PUBLIC_ORDER_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ_';

function randomPublicIdCharacters(length: number) {
  return Array.from(
    randomBytes(length),
    (byte) => PUBLIC_ORDER_ID_ALPHABET[byte & 31],
  ).join('');
}

export function createPublicOrderId(now: Date = new Date()) {
  const year = getGuatemalaDate(now).slice(2, 4);

  return `GUT-${year}-${randomPublicIdCharacters(8)}`;
}

export function createReceiptToken() {
  return randomBytes(32).toString('base64url');
}

export function hashReceiptToken(receiptToken: string) {
  return createHash('sha256').update(receiptToken).digest('hex');
}
