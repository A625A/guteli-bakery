/** Server runtime switch. Only an exact, explicit opt-in allows commercial requests. */
export function commercialOrdersEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.COMMERCIAL_ORDERS_ENABLED === 'true';
}

export function commercialDemoResponse() {
  return Response.json(
    {
      error: {
        code: 'COMMERCIAL_DEMO',
        message:
          'Estamos en demostración. Los pedidos todavía no están habilitados.',
      },
    },
    {
      status: 403,
      headers: {
        'cache-control': 'private, no-store',
        'referrer-policy': 'no-referrer',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}
