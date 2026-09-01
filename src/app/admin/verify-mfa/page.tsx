import { MfaChallenge } from '@/components/admin/MfaChallenge';

export default function VerifyMfaPage() {
  return (
    <main className="admin-auth-page" id="main-content" tabIndex={-1}>
      <MfaChallenge />
    </main>
  );
}
