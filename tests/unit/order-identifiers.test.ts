import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  PUBLIC_ORDER_ID_ALPHABET,
  createPublicOrderId,
  createReceiptToken,
  hashReceiptToken,
} from '@/server/orders/identifiers';

describe('order identifiers', () => {
  it('uses a documented 32-character human-safe alphabet', () => {
    expect(PUBLIC_ORDER_ID_ALPHABET).toHaveLength(32);
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
