import { MfaEnrollment } from '@/components/admin/MfaEnrollment';

export default function EnrollMfaPage() {
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <MfaEnrollment />
    </main>
  );
}
