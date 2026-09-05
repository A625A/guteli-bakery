'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { AdminUserDto } from '@/server/auth/admin-users';

import { adminAuthClient } from './auth-client';

type AdminUserList = Readonly<{
  users: readonly AdminUserDto[];
  page: number;
  pageSize: number;
  total: number;
}>;

type ApiError = Readonly<{
  error?: { code?: string; message?: string };
}>;

export function AdminUserForm({
  initial,
  currentUserId,
}: {
  initial: AdminUserList;
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initial.users);
  const [message, setMessage] = useState<string | null>(null);
  const [credential, setCredential] = useState<{
    value: string;
    expiresAt: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [reauthenticationRequired, setReauthenticationRequired] =
    useState(false);

  async function readResponse(response: Response) {
    const payload = (await response.json()) as ApiError & {
      user?: AdminUserDto;
      setupCredential?: string;
      setupCredentialExpiresAt?: string;
    };
    if (!response.ok || !payload.user) {
      if (payload.error?.code === 'REAUTHENTICATION_REQUIRED') {
        setReauthenticationRequired(true);
      }
      throw new Error(
        payload.error?.message ?? 'No se pudo guardar el cambio.',
      );
    }
    return payload;
  }

  async function createUser(formData: FormData) {
    setPending(true);
    setMessage(null);
    setCredential(null);
    setReauthenticationRequired(false);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'CREATE',
          email: formData.get('email'),
          name: formData.get('name'),
          role: 'ADMIN',
        }),
      });
      const payload = await readResponse(response);
      setUsers((current) =>
        [...current, payload.user!].sort((a, b) =>
          a.email.localeCompare(b.email),
        ),
      );
      setCredential({
        value: payload.setupCredential!,
        expiresAt: payload.setupCredentialExpiresAt!,
      });
      setMessage('Cuenta administrativa creada.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No se pudo crear la cuenta.',
      );
    } finally {
      setPending(false);
    }
  }

  async function mutateUser(
    candidate: AdminUserDto,
    mutation:
      | { kind: 'SET_ACTIVE'; active: boolean }
      | { kind: 'SET_ROLE'; role: 'OWNER' | 'ADMIN' },
  ) {
    setPending(true);
    setMessage(null);
    setCredential(null);
    setReauthenticationRequired(false);
    try {
      const response = await fetch(`/api/admin/users/${candidate.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...mutation, userId: candidate.id }),
      });
      const payload = await readResponse(response);
      setUsers((current) =>
        current.map((item) =>
          item.id === payload.user!.id ? payload.user! : item,
        ),
      );
      setMessage('Cambio guardado. Las sesiones afectadas fueron cerradas.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el cambio.',
      );
    } finally {
      setPending(false);
    }
  }

  async function restartAuthentication() {
    setPending(true);
    await adminAuthClient.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <>
      <section aria-labelledby="create-admin-title" className="admin-auth-card">
        <h2 id="create-admin-title">Crear administradora</h2>
        <form action={createUser}>
          <label htmlFor="admin-name">Nombre</label>
          <input id="admin-name" name="name" required maxLength={160} />
          <label htmlFor="admin-email">Correo electrónico</label>
          <input
            id="admin-email"
            name="email"
            required
            type="email"
            maxLength={254}
            autoComplete="off"
          />
          <button disabled={pending} type="submit">
            Crear administradora
          </button>
        </form>
      </section>

      {credential ? (
        <section aria-labelledby="credential-title" role="status">
          <h2 id="credential-title">Credencial temporal</h2>
          <p>
            Muéstrala una sola vez a la nueva administradora. Expira en 24 horas
            y deberá cambiarla antes de configurar MFA.
          </p>
          <output aria-label="Credencial temporal">{credential.value}</output>
          <p>
            Vence:{' '}
            <time dateTime={credential.expiresAt}>{credential.expiresAt}</time>
          </p>
        </section>
      ) : null}

      {message ? <p role="alert">{message}</p> : null}
      {reauthenticationRequired ? (
        <button
          disabled={pending}
          onClick={restartAuthentication}
          type="button"
        >
          Volver a iniciar sesión
        </button>
      ) : null}

      <section aria-labelledby="admin-users-title">
        <h2 id="admin-users-title">Cuentas administrativas</h2>
        <div className="admin-dashboard__table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Cuenta</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">MFA</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((candidate) => (
                <tr key={candidate.id}>
                  <th scope="row">
                    {candidate.name}
                    <br />
                    <small>{candidate.email}</small>
                  </th>
                  <td>
                    {candidate.role === 'OWNER'
                      ? 'Propietaria'
                      : 'Administradora'}
                  </td>
                  <td>{candidate.active ? 'Activa' : 'Desactivada'}</td>
                  <td>
                    {candidate.twoFactorEnabled ? 'Configurado' : 'Pendiente'}
                  </td>
                  <td>
                    <button
                      aria-label={`${
                        candidate.role === 'OWNER'
                          ? 'Cambiar a administradora'
                          : 'Cambiar a propietaria'
                      }: ${candidate.name}`}
                      disabled={pending}
                      onClick={() =>
                        mutateUser(candidate, {
                          kind: 'SET_ROLE',
                          role: candidate.role === 'OWNER' ? 'ADMIN' : 'OWNER',
                        })
                      }
                      type="button"
                    >
                      {candidate.role === 'OWNER'
                        ? 'Cambiar a administradora'
                        : 'Cambiar a propietaria'}
                    </button>
                    <button
                      aria-label={`${
                        candidate.active ? 'Desactivar' : 'Reactivar'
                      }: ${candidate.name}`}
                      disabled={
                        pending ||
                        (candidate.id === currentUserId && candidate.active)
                      }
                      onClick={() =>
                        mutateUser(candidate, {
                          kind: 'SET_ACTIVE',
                          active: !candidate.active,
                        })
                      }
                      type="button"
                    >
                      {candidate.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
