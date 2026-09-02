import type { ReactNode } from 'react';

import { StorefrontShell } from '@/components/shared/StorefrontShell';

export const dynamic = 'force-dynamic';

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
