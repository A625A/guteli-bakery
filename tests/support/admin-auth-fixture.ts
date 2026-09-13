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

export const adminCatalogAuthFixture = {
  email: 'browser-catalog-owner@example.test',
  name: 'Propietaria de catálogo',
  setupPassword: 'catalog-setup-password-at-least-14-characters',
  password: 'catalog-changed-password-at-least-14-characters',
} as const;

export const adminOrdersAuthFixture = {
  email: 'browser-orders-owner@example.test',
  name: 'Propietaria de pedidos',
  setupPassword: 'orders-setup-password-at-least-14-characters',
  password: 'orders-changed-password-at-least-14-characters',
} as const;
