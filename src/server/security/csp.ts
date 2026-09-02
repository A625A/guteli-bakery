const normalize = (value: string) => value.replace(/\s{2,}/g, ' ').trim();

export function buildContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
) {
  return normalize(`
    default-src 'self';
    base-uri 'self';
    connect-src 'self';
    font-src 'self';
    form-action 'self';
    frame-ancestors 'none';
    frame-src 'none';
    img-src 'self' blob: data:;
    manifest-src 'self';
    media-src 'self';
    object-src 'none';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDevelopment ? " 'unsafe-eval'" : ''
    };
    style-src 'self' ${isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`};
    upgrade-insecure-requests;
  `);
}
