export const privateHeaders = {
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
} as const;

export function isPrivatePath(path: string): boolean {
  return [
    '/admin',
    '/api/admin',
    '/api/auth',
    '/order',
    '/cart',
    '/api/orders',
    '/api/order-status',
    '/api/checkout-session',
    '/api/checkout-review',
    '/api/checkout-summary',
    '/api/webhooks',
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
