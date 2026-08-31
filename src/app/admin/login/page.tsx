import { LoginForm } from '@/components/admin/LoginForm';

export default function AdminLoginPage() {
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <LoginForm />
    </main>
  );
}
