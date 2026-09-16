import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { ownerCliErrorMessage } from '../../scripts/create-owner-error';

describe('owner CLI errors', () => {
  it('starts through the npm script and reaches the non-TTY denial', () => {
    const result = spawnSync('npm', ['run', 'owner:create'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://guteli:guteli@127.0.0.1:55433/guteli_test',
      },
      timeout: 5_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'This command requires an interactive terminal and no arguments.',
    );
    expect(result.stderr).not.toContain('This module cannot be imported');
  });

  it('preserves only expected interactive validation messages', () => {
    expect(
      ownerCliErrorMessage(new Error('Las contraseñas no coinciden.')),
    ).toBe('Las contraseñas no coinciden.');
  });

  it('does not expose raw database or adapter exceptions', () => {
    expect(
      ownerCliErrorMessage(
        new Error(
          'duplicate key violates constraint account_password_owner@example.test',
        ),
      ),
    ).toBe('No se pudo crear el propietario.');
  });
});
