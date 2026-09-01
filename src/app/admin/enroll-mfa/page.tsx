import { MfaEnrollment } from '@/components/admin/MfaEnrollment';
import { requireAdminAuthPage } from '@/server/auth/admin-page-access';

export default async function EnrollMfaPage() {
  await requireAdminAuthPage('/admin/enroll-mfa');
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <MfaEnrollment />
    </main>
  );
}
