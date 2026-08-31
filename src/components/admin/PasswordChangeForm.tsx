'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { adminAuthClient } from './auth-client';

export function PasswordChangeForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 14) {
      setMessage('La nueva contraseña debe tener al menos 14 caracteres.');
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await adminAuthClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setMessage('No se pudo cambiar la contraseña. Revisa los datos.');
        return;
      }
      router.replace('/admin/enroll-mfa');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-auth-card" onSubmit={submit}>
      <h1>Cambia tu contraseña</h1>
      <p>Debes cambiar esta contraseña de configuración antes de continuar.</p>
      <label>
        Contraseña actual
        <input
          autoComplete="current-password"
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          type="password"
          value={currentPassword}
        />
      </label>
      <label>
        Nueva contraseña
        <input
          autoComplete="new-password"
          minLength={14}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
      </label>
      {message ? <p role="alert">{message}</p> : null}
      <button disabled={pending} type="submit">
        {pending ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
