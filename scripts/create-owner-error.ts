const SAFE_OWNER_CLI_ERRORS = new Set([
  'This command requires an interactive terminal and no arguments.',
  'Owner provisioning cancelled.',
  'La contraseña debe tener al menos 14 caracteres.',
  'Las contraseñas no coinciden.',
]);

export function ownerCliErrorMessage(error: unknown) {
  if (error instanceof Error && SAFE_OWNER_CLI_ERRORS.has(error.message)) {
    return error.message;
  }
  return 'No se pudo crear el propietario.';
}
