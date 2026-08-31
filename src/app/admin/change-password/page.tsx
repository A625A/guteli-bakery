import { PasswordChangeForm } from '@/components/admin/PasswordChangeForm';

export default function ChangePasswordPage() {
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <PasswordChangeForm />
    </main>
  );
}
