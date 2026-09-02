export const adminAuthFixture = {
  email: 'browser-owner@example.test',
  name: 'Propietaria de prueba',
  setupPassword: 'browser-setup-password-at-least-14-characters',
  password: 'browser-changed-password-at-least-14-characters',
} as const;

export const adminShellAuthFixture = {
  email: 'browser-admin-shell@example.test',
  name: 'Administradora de prueba',
  setupPassword: 'shell-setup-password-at-least-14-characters',
  password: 'shell-changed-password-at-least-14-characters',
} as const;
