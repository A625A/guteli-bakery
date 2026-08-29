import { createHash, randomBytes } from 'node:crypto';

import { getGuatemalaDate } from '@/lib/date';

export const PUBLIC_ORDER_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

type RandomByteSource = (size: number) => Uint8Array;
const MAX_ACCEPTED_RANDOM_BYTE =
  Math.floor(256 / PUBLIC_ORDER_ID_ALPHABET.length) *
  PUBLIC_ORDER_ID_ALPHABET.length;

function randomPublicIdCharacters(
  length: number,
  randomByteSource: RandomByteSource,
) {
  const characters: string[] = [];

  while (characters.length < length) {
    for (const byte of randomByteSource(length - characters.length)) {
      if (byte >= MAX_ACCEPTED_RANDOM_BYTE) continue;
      characters.push(
        PUBLIC_ORDER_ID_ALPHABET[byte % PUBLIC_ORDER_ID_ALPHABET.length],
      );
      if (characters.length === length) break;
    }
  }

  return characters.join('');
}

export function createPublicOrderId(
  now: Date = new Date(),
  randomByteSource: RandomByteSource = randomBytes,
) {
  const year = getGuatemalaDate(now).slice(2, 4);

  return `GUT-${year}-${randomPublicIdCharacters(8, randomByteSource)}`;
}

export function createReceiptToken() {
  return randomBytes(32).toString('base64url');
}

export function hashReceiptToken(receiptToken: string) {
  return createHash('sha256').update(receiptToken).digest('hex');
}
