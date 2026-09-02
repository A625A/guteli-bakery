import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AdminNav } from '@/components/admin/AdminNav';
import { getAdminSessionAccess } from '@/server/auth/admin-page-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

async function VerifiedAdminNavigation() {
  const access = await getAdminSessionAccess(await headers());
  if (access.policy !== 'ALLOWED') return null;
  return <AdminNav />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <header className="admin-shell__header">
        <Link className="admin-shell__brand" href="/admin">
          Güteli <span>Administración</span>
        </Link>
        <VerifiedAdminNavigation />
      </header>
      {children}
    </div>
  );
}
