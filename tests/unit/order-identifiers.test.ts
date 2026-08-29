import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  PUBLIC_ORDER_ID_ALPHABET,
  createPublicOrderId,
  createReceiptToken,
  hashReceiptToken,
} from '@/server/orders/identifiers';

describe('order identifiers', () => {
  it('uses a documented 31-character human-safe alphanumeric alphabet', () => {
    expect(PUBLIC_ORDER_ID_ALPHABET).toHaveLength(31);
    expect(PUBLIC_ORDER_ID_ALPHABET).toMatch(/^[2-9A-HJKMNP-Z]+$/);
    for (const ambiguousCharacter of ['0', '1', 'I', 'L', 'O']) {
      expect(PUBLIC_ORDER_ID_ALPHABET).not.toContain(ambiguousCharacter);
    }
  });

  it('uses the Guatemala-local year and eight random alphabet characters', () => {
    const publicId = createPublicOrderId(new Date('2027-01-01T00:30:00.000Z'));

    expect(publicId).toMatch(
      new RegExp(`^GUT-26-[${PUBLIC_ORDER_ID_ALPHABET}]{8}$`),
    );
  });

  it('rejects entropy outside complete 31-symbol groups without bias', () => {
    const source = () => Buffer.from([248, 0, 1, 2, 3, 4, 5, 6, 7]);
    const createWithControlledEntropy = createPublicOrderId as (
      now: Date,
      randomByteSource: (size: number) => Uint8Array,
    ) => string;

    expect(
      createWithControlledEntropy(new Date('2027-01-01T00:30:00.000Z'), source),
    ).toBe('GUT-26-23456789');
  });

  it('creates a new high-entropy receipt token and hashes it one-way', () => {
    const firstToken = createReceiptToken();
    const secondToken = createReceiptToken();
    const firstHash = hashReceiptToken(firstToken);

    expect(firstToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(firstToken).not.toBe(secondToken);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
    expect(firstHash).toBe(
      createHash('sha256').update(firstToken).digest('hex'),
    );
    expect(firstHash).not.toContain(firstToken);
  });
});
