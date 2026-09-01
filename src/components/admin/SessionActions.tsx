'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { adminAuthClient } from './auth-client';

const logoutError = 'No se pudo cerrar la sesión. Intenta de nuevo.';

export function SessionActions() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function finish(action: () => Promise<{ error?: unknown }>) {
    setMessage(null);
    setPending(true);
    try {
      const result = await action();
      if (result.error) {
        setMessage(logoutError);
        return;
      }
      router.replace('/admin/login');
      router.refresh();
    } catch {
      setMessage(logoutError);
    } finally {
      setPending(false);
    }
  }

  function signOutCurrent() {
    return finish(() => adminAuthClient.signOut());
  }

  function signOutEverywhere() {
    return finish(async () => {
      const revoked = await adminAuthClient.revokeSessions();
      if (revoked.error) return revoked;
      return adminAuthClient.signOut();
    });
  }

  return (
    <section aria-labelledby="session-actions-title">
      <h2 id="session-actions-title">Sesiones</h2>
      <button disabled={pending} onClick={signOutCurrent} type="button">
        Cerrar esta sesión
      </button>
      <button disabled={pending} onClick={signOutEverywhere} type="button">
        Cerrar todas las sesiones
      </button>
      {message ? <p role="alert">{message}</p> : null}
    </section>
  );
}
