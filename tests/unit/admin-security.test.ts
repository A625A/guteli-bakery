import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { config, proxy } from '@/proxy';
import { buildContentSecurityPolicy } from '@/server/security/csp';
import {
  InvalidMutationOriginError,
  requireTrustedMutationOrigin,
} from '@/server/security/origin';

describe('admin request security', () => {
  it('accepts only the configured serialized application origin', () => {
    const trusted = new Headers({ origin: 'https://admin.guteli.test' });
    expect(() =>
      requireTrustedMutationOrigin(trusted, 'https://admin.guteli.test'),
    ).not.toThrow();

    for (const origin of [
      null,
      'null',
      'not a URL',
      'https://admin.guteli.test.evil.example',
      'https://admin.guteli.test/path',
      'http://admin.guteli.test',
    ]) {
      const headers = new Headers();
      if (origin !== null) headers.set('origin', origin);
      expect(() =>
        requireTrustedMutationOrigin(headers, 'https://admin.guteli.test'),
      ).toThrow(InvalidMutationOriginError);
    }
  });

  it('builds a strict nonce policy without production unsafe directives', () => {
    const policy = buildContentSecurityPolicy('request-nonce', false);

    expect(policy).toContain("script-src 'self' 'nonce-request-nonce'");
    expect(policy).toContain("style-src 'self' 'nonce-request-nonce'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('allows only the development inline styles required by the Next runtime', () => {
    const policy = buildContentSecurityPolicy('development-nonce', true);

    expect(policy).toContain(
      "script-src 'self' 'nonce-development-nonce' 'strict-dynamic' 'unsafe-eval'",
    );
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('forwards a unique nonce and marks admin responses private', () => {
    const first = proxy(
      new NextRequest('https://admin.guteli.test/admin/orders'),
    );
    const second = proxy(
      new NextRequest('https://admin.guteli.test/admin/orders'),
    );

    const firstPolicy = first.headers.get('content-security-policy');
    const secondPolicy = second.headers.get('content-security-policy');
    expect(firstPolicy).toMatch(/'nonce-[^']+'/);
    expect(secondPolicy).toMatch(/'nonce-[^']+'/);
    expect(firstPolicy).not.toBe(secondPolicy);
    expect(first.headers.get('x-middleware-request-x-nonce')).toBeTruthy();
    expect(first.headers.get('cache-control')).toBe('private, no-store');
    expect(first.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(first.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('never exempts protected admin paths that look like static files', () => {
    expect(config.matcher).toEqual(
      expect.arrayContaining([
        '/admin/:path*',
        '/api/admin',
        '/api/admin/:path*',
      ]),
    );
  });

  it('marks the exact admin API root private too', () => {
    const response = proxy(
      new NextRequest('https://admin.guteli.test/api/admin'),
    );

    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
});
