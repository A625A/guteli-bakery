import { describe, expect, it } from 'vitest';

import { ownerCliErrorMessage } from '../../scripts/create-owner-error';

describe('owner CLI errors', () => {
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
