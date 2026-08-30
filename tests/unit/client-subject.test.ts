import { describe, expect, it } from 'vitest';

import {
  ClientAddressError,
  getTrustedClientAddress,
  normalizeGuatemalaPhoneRateIdentity,
} from '@/server/security/client-subject';

describe('normalizeGuatemalaPhoneRateIdentity', () => {
  it.each([
    ['55555555', '50255555555'],
    ['+502 5555-5555', '50255555555'],
    ['50255555555', '50255555555'],
    ['00502 5555 5555', '50255555555'],
  ])('maps %s to the same Guatemala rate identity', (phone, expected) => {
    expect(normalizeGuatemalaPhoneRateIdentity(phone)).toBe(expected);
  });

  it.each([
    ['+1 (555) 555-5555', '15555555555'],
    ['001 555 555 5555', '15555555555'],
    ['15555555555', '15555555555'],
    ['+44 7700 900123', '447700900123'],
  ])(
    'preserves the numeric identity of a valid international display phone %s',
    (phone, expected) => {
      expect(normalizeGuatemalaPhoneRateIdentity(phone)).toBe(expected);
    },
  );
});

describe('getTrustedClientAddress', () => {
  it('accepts a one-address XFF chain behind one trusted proxy', () => {
    const address = getTrustedClientAddress(
      new Request('http://localhost/api/orders', {
        headers: { 'x-forwarded-for': '198.51.100.9' },
      }),
      { trustedProxyHops: 1, directAddress: null },
    );

    expect(address).toBe('198.51.100.9');
  });

  it('uses the trusted boundary instead of a spoofed leftward XFF value', () => {
    const address = getTrustedClientAddress(
      new Request('http://localhost/api/orders', {
        headers: { 'x-forwarded-for': '198.51.100.9, 203.0.113.42' },
      }),
      { trustedProxyHops: 1, directAddress: null },
    );

    expect(address).toBe('203.0.113.42');
  });

  it('fails closed for insufficient or malformed trusted XFF chains', () => {
    const insufficient = new Request('http://localhost/api/orders', {
      headers: { 'x-forwarded-for': '198.51.100.9' },
    });
    const malformed = new Request('http://localhost/api/orders', {
      headers: { 'x-forwarded-for': 'not-an-ip, 203.0.113.42' },
    });

    expect(() =>
      getTrustedClientAddress(insufficient, {
        trustedProxyHops: 2,
        directAddress: null,
      }),
    ).toThrow(ClientAddressError);
    expect(() =>
      getTrustedClientAddress(malformed, {
        trustedProxyHops: 1,
        directAddress: null,
      }),
    ).toThrow(ClientAddressError);
  });
});
