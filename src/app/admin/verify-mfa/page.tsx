import { MfaChallenge } from '@/components/admin/MfaChallenge';
import { redirectVerifiedAdminFromMfaChallenge } from '@/server/auth/admin-page-access';

export default async function VerifyMfaPage() {
  await redirectVerifiedAdminFromMfaChallenge();
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <MfaChallenge />
    </main>
  );
}
