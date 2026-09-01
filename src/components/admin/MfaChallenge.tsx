'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { adminAuthClient } from './auth-client';

export function MfaChallenge() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function complete(request: () => Promise<{ error?: unknown }>) {
    setMessage(null);
    setPending(true);
    try {
      const result = await request();
      if (result.error) {
        setMessage('El código de verificación no es válido.');
        return;
      }
      router.replace('/admin/login');
    } finally {
      setPending(false);
    }
  }

  function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return complete(() => adminAuthClient.twoFactor.verifyTotp({ code }));
  }

  function verifyBackupCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return complete(() =>
      adminAuthClient.twoFactor.verifyBackupCode({ code: backupCode }),
    );
  }

  return (
    <section className="admin-auth-card" aria-labelledby="mfa-challenge-title">
      <h1 id="mfa-challenge-title">Verifica tu autenticador</h1>
      <p>Introduce un código de tu autenticador o un código de recuperación.</p>
      <form onSubmit={verifyTotp}>
        <label>
          Código de verificación
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
        </label>
        <button disabled={pending} type="submit">
          Verificar código
        </button>
      </form>
      <form onSubmit={verifyBackupCode}>
        <label>
          Código de recuperación
          <input
            autoComplete="one-time-code"
            onChange={(event) => setBackupCode(event.target.value)}
            required
            value={backupCode}
          />
        </label>
        <button disabled={pending} type="submit">
          Recuperar acceso
        </button>
      </form>
      {message ? <p role="alert">{message}</p> : null}
    </section>
  );
}
