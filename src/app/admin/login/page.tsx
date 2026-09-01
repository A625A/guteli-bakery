import { LoginForm } from '@/components/admin/LoginForm';
import { requireAdminAuthPage } from '@/server/auth/admin-page-access';

export default async function AdminLoginPage() {
  await requireAdminAuthPage('/admin/login');
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <LoginForm />
    </main>
  );
}
