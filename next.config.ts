import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // URLs may carry receipt credentials; Server Function arguments may contain PII.
  logging: false,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
};

export default nextConfig;
