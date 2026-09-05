import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { AdminUserForm } from '@/components/admin/AdminUserForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { listAdminUsers } from '@/server/auth/admin-users';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Usuarios | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function AdminUsersPage() {
  const actor = await requireVerifiedAdminSession();
  if (actor.role !== 'OWNER') notFound();
  const users = await listAdminUsers(await headers());

  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Acceso interno</p>
          <h1>Usuarios administrativos</h1>
          <p>
            Crea cuentas, cambia roles y cierra las sesiones de quienes ya no
            deben tener acceso.
          </p>
        </div>
      </header>
      <AdminUserForm initial={users} currentUserId={actor.userId} />
    </main>
  );
}
