import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { AdminUserForm } from '@/components/admin/AdminUserForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import {
  listAdminUsers,
  parseAdminUserPagination,
} from '@/server/auth/admin-users';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Usuarios | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type AdminUsersSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function paginationFrom(parameters: Awaited<AdminUsersSearchParams>) {
  for (const [key, value] of Object.entries(parameters)) {
    if ((key !== 'page' && key !== 'pageSize') || typeof value !== 'string') {
      notFound();
    }
  }
  try {
    return parseAdminUserPagination({
      page: parameters.page,
      pageSize: parameters.pageSize,
    });
  } catch (error) {
    if (error instanceof RangeError) notFound();
    throw error;
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: AdminUsersSearchParams;
}) {
  const actor = await requireVerifiedAdminSession();
  if (actor.role !== 'OWNER') notFound();
  const pagination = paginationFrom(await searchParams);
  const users = await listAdminUsers(await headers(), pagination);
  const lastPage = Math.max(1, Math.ceil(users.total / users.pageSize));
  if (users.page > lastPage) {
    redirect(`/admin/users?page=${lastPage}&pageSize=${users.pageSize}`);
  }

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
