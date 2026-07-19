export const siteConfig = {
  name: 'Güteli Bakery',
  locale: 'es-GT',
  currency: 'GTQ',
} as const;

export const primaryNavigation = [
  { href: '/', label: 'Inicio' },
  { href: '/menu/', label: 'Menú' },
  { href: '/cart/', label: 'Carrito' },
  { href: '/order/', label: 'Pedido' },
  { href: '/contact/', label: 'Contacto' },
] as const;
