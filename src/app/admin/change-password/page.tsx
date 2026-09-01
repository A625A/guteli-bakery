import { PasswordChangeForm } from '@/components/admin/PasswordChangeForm';
import { requireAdminAuthPage } from '@/server/auth/admin-page-access';

export default async function ChangePasswordPage() {
  await requireAdminAuthPage('/admin/change-password');
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <PasswordChangeForm />
    </main>
  );
}
