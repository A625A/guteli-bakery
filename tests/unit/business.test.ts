import { describe, expect, it } from 'vitest';

import { primaryNavigation, siteConfig } from '@/content/business';

describe('site foundation contract', () => {
  it('uses the approved Guatemala locale and currency', () => {
    expect(siteConfig).toEqual({
      name: 'Güteli Bakery',
      locale: 'es-GT',
      currency: 'GTQ',
    });
  });

  it('exposes each foundation route once with Spanish labels', () => {
    expect(primaryNavigation).toEqual([
      { href: '/', label: 'Inicio' },
      { href: '/menu/', label: 'Menú' },
      { href: '/cart/', label: 'Carrito' },
      { href: '/order/', label: 'Pedido' },
      { href: '/contact/', label: 'Contacto' },
    ]);
    expect(new Set(primaryNavigation.map(({ href }) => href)).size).toBe(
      primaryNavigation.length,
    );
  });
});
