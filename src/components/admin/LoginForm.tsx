'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { adminAuthClient } from './auth-client';

const credentialError = 'Correo o contraseña incorrectos.';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    try {
      const result = await adminAuthClient.signIn.email({ email, password });
      if (result.error) {
        setMessage(
          result.error.status === 429
            ? 'Demasiados intentos. Espera antes de volver a intentar.'
            : credentialError,
        );
        return;
      }
      router.replace('/admin/enroll-mfa');
    } catch {
      setMessage(credentialError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-auth-card" onSubmit={submit}>
      <h1>Acceso administrativo</h1>
      <p>Ingresa con tu cuenta administrativa para continuar.</p>
      <label>
        Correo electrónico
        <input
          autoComplete="username"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        Contraseña
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {message ? <p role="alert">{message}</p> : null}
      <button disabled={pending} type="submit">
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
