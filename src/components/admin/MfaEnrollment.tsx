'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { adminAuthClient } from './auth-client';

type Enrollment = Readonly<{
  backupCodes: string[];
  totpURI: string;
}>;

export function MfaEnrollment() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [confirmedBackupCodes, setConfirmedBackupCodes] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const result = await adminAuthClient.twoFactor.enable({
        password,
        method: 'totp',
        issuer: 'Guteli Bakery',
      });
      if (
        result.error ||
        result.data?.method !== 'totp' ||
        !result.data.totpURI ||
        !result.data.backupCodes
      ) {
        setMessage(
          'No se pudo iniciar la configuración. Verifica tu contraseña.',
        );
        return;
      }
      setEnrollment({
        totpURI: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
      setPassword('');
    } finally {
      setPending(false);
    }
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmedBackupCodes) {
      setMessage('Confirma que guardaste los códigos de recuperación.');
      return;
    }
    setMessage(null);
    setPending(true);
    try {
      const result = await adminAuthClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setMessage('El código de verificación no es válido.');
        return;
      }
      router.replace('/admin/login');
    } finally {
      setPending(false);
    }
  }

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      const result = await adminAuthClient.twoFactor.verifyBackupCode({
        code: recoveryCode,
      });
      if (result.error) {
        setMessage('El código de recuperación no es válido.');
        return;
      }
      router.replace('/admin/login');
    } finally {
      setPending(false);
    }
  }

  async function signOutEverywhere() {
    setPending(true);
    try {
      await adminAuthClient.revokeOtherSessions();
      await adminAuthClient.signOut();
      router.replace('/admin/login');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-auth-card" aria-labelledby="mfa-title">
      <h1 id="mfa-title">Configura tu autenticador</h1>
      <p>
        Las cuentas administrativas requieren autenticación multifactor antes de
        acceder al panel.
      </p>
      {!enrollment ? (
        <form onSubmit={beginEnrollment}>
          <label>
            Contraseña actual
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button disabled={pending} type="submit">
            Configurar autenticador
          </button>
        </form>
      ) : (
        <>
          <p>
            Agrega esta clave en tu aplicación de autenticación. No la
            compartas.
          </p>
          <output className="admin-auth-secret">{enrollment.totpURI}</output>
          <h2>Códigos de recuperación</h2>
          <p>Guárdalos ahora: no volverán a mostrarse.</p>
          <ul aria-label="Códigos de recuperación">
            {enrollment.backupCodes.map((backupCode) => (
              <li key={backupCode}>{backupCode}</li>
            ))}
          </ul>
          <form onSubmit={verifyTotp}>
            <label>
              Código de verificación
              <input
                inputMode="numeric"
                onChange={(event) => setCode(event.target.value)}
                required
                value={code}
              />
            </label>
            <label>
              <input
                checked={confirmedBackupCodes}
                onChange={(event) =>
                  setConfirmedBackupCodes(event.target.checked)
                }
                type="checkbox"
              />
              Guardé los códigos de recuperación en un lugar seguro.
            </label>
            <button disabled={pending} type="submit">
              Verificar código
            </button>
          </form>
        </>
      )}
      <form onSubmit={recover}>
        <label>
          Código de recuperación
          <input
            autoComplete="one-time-code"
            onChange={(event) => setRecoveryCode(event.target.value)}
            required
            value={recoveryCode}
          />
        </label>
        <button disabled={pending} type="submit">
          Recuperar acceso
        </button>
      </form>
      {message ? <p role="alert">{message}</p> : null}
      <button disabled={pending} onClick={signOutEverywhere} type="button">
        Cerrar sesión en todos los dispositivos
      </button>
    </section>
  );
}
