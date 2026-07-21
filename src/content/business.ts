export const siteConfig = {
  name: 'Güteli Bakery',
  locale: 'es-GT',
  currency: 'GTQ',
  whatsappNumber: '4256-9861',
  whatsappDigits: '50242569861',
  advanceDays: 2,
} as const;

export const operationalCopy = {
  quantityUnknown: 'Cantidad por confirmar',
  deliveryCost: 'Costo de envío por confirmar según ubicación',
  confirmation: 'El pedido queda sujeto a confirmación por WhatsApp',
  pickupInformation: 'Solicita información de recogida por WhatsApp',
} as const;

export const primaryNavigation = [
  { href: '/', label: 'Inicio' },
  { href: '/menu/', label: 'Menú' },
  { href: '/cart/', label: 'Carrito' },
  { href: '/order/', label: 'Pedido' },
  { href: '/contact/', label: 'Contacto' },
] as const;
