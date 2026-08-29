import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export class ClientAddressError extends Error {
  constructor() {
    super('A trusted client address is required.');
    this.name = 'ClientAddressError';
  }
}

function normalizeClientAddress(value: string): string | null {
  const address = value.trim();
  const version = isIP(address);
  if (version === 0) return null;

  if (version === 4) {
    return address
      .split('.')
      .map((segment) => String(Number(segment)))
      .join('.');
  }

  const hostname = new URL(`http://[${address}]/`).hostname;
  return hostname.slice(1, -1).toLowerCase();
}

function parseForwardedAddresses(header: string): readonly string[] | null {
  const addresses = header
    .split(',')
    .map((value) => normalizeClientAddress(value));
  if (addresses.some((address) => address === null)) return null;
  return addresses as string[];
}

export function getTrustedClientAddress(
  request: Request,
  options: Readonly<{
    trustedProxyHops: number;
    directAddress: string | null | undefined;
  }>,
): string {
  if (options.trustedProxyHops === 0) {
    const directAddress = options.directAddress
      ? normalizeClientAddress(options.directAddress)
      : null;
    if (!directAddress) throw new ClientAddressError();
    return directAddress;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) throw new ClientAddressError();

  const addresses = parseForwardedAddresses(forwarded);
  if (!addresses || addresses.length < options.trustedProxyHops + 1) {
    throw new ClientAddressError();
  }

  return addresses[addresses.length - options.trustedProxyHops - 1];
}

export function createHmacSubject(
  secret: string,
  namespace: string,
  value: string,
): string {
  return createHmac('sha256', secret)
    .update(`guteli:${namespace}:v1\u0000`)
    .update(value)
    .digest('hex');
}
