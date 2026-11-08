import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Netlify's OpenNext adapter packages SSR, API and admin routes. Docker keeps standalone.
  ...(process.env.NETLIFY === 'true' ? {} : { output: 'standalone' as const }),
  env: {
    GUTELI_DEPLOY_CONTEXT:
      process.env.NETLIFY === 'true'
        ? (process.env.CONTEXT ?? 'unknown')
        : 'local',
    NEXT_PUBLIC_IMAGE_UPLOAD_TRANSPORT_LIMIT:
      process.env.NETLIFY === 'true' ? '4194304' : '8388608',
  },
  // URLs may carry receipt credentials; Server Function arguments may contain PII.
  logging: false,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
};

export default nextConfig;
