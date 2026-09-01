import { SessionActions } from '@/components/admin/SessionActions';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';

export default async function AdminPage() {
  await requireVerifiedAdminSession();
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <section className="admin-auth-card" aria-labelledby="admin-title">
        <h1 id="admin-title">Panel administrativo</h1>
        <p>Tu sesión tiene autenticación multifactor verificada.</p>
        <SessionActions />
      </section>
    </main>
  );
}
