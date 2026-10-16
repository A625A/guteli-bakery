import { describe, expect, it, vi } from 'vitest';
import {
  logOperationalEvent,
  operationalSnapshot,
} from '@/server/observability/safe-log';
import { isPrivatePath, privateHeaders } from '@/server/privacy/headers';

describe('privacy boundaries', () => {
  it('never serializes untrusted diagnostics or accepts arbitrary event names', () => {
    const write = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const canary = {
      message: 'María +50255555555 token=secret cookie=password',
      toJSON() {
        throw new Error('must not inspect');
      },
    };
    logOperationalEvent(canary);
    logOperationalEvent('ORDER_SAVE_FAILED', canary);
    const output = JSON.stringify(write.mock.calls);
    expect(output).not.toMatch(/María|55555555|secret|password|cookie|message/);
    expect(output).toContain('ORDER_SAVE_FAILED');
    expect(
      operationalSnapshot().some((row) => row.event === 'ORDER_SAVE_FAILED'),
    ).toBe(true);
  });
  it.each([
    '/admin',
    '/admin/login/',
    '/api/admin/orders',
    '/api/auth/sign-in/email',
    '/order/confirmation/private-token/',
    '/api/order-status/private-token',
    '/api/checkout-summary',
    '/api/checkout-session',
    '/cart/',
  ])('protects private surface %s', (path) => {
    expect(isPrivatePath(path)).toBe(true);
    expect(privateHeaders['cache-control']).toContain('no-store');
    expect(privateHeaders['referrer-policy']).toBe('no-referrer');
    expect(privateHeaders['x-robots-tag']).toContain('noindex');
  });
  it('does not classify public catalog as a private record', () => {
    expect(isPrivatePath('/menu/')).toBe(false);
    expect(isPrivatePath('/api/products')).toBe(false);
  });
});
