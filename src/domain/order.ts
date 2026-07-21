import { addCalendarDays } from '@/lib/date';

export type OrderFormValues = {
  name: string;
  phone: string;
  fulfillment: 'pickup' | 'delivery';
  requestedDate: string;
  location: string;
  notes: string;
};

export type OrderErrors = Partial<Record<keyof OrderFormValues, string>>;

export function validateOrder(
  values: OrderFormValues,
  minimumOrderDate: string,
): OrderErrors {
  const errors: OrderErrors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  const requestedDate = values.requestedDate.trim();
  const location = values.location.trim();

  if (!name) {
    errors.name = 'Ingresa tu nombre.';
  }

  if (!phone) {
    errors.phone = 'Ingresa tu teléfono.';
  }

  if (!requestedDate) {
    errors.requestedDate = 'Selecciona una fecha.';
  } else if (!isValidIsoDate(requestedDate)) {
    errors.requestedDate = 'Selecciona una fecha válida.';
  } else if (requestedDate < minimumOrderDate) {
    errors.requestedDate = `Selecciona una fecha a partir del ${minimumOrderDate}.`;
  }

  if (values.fulfillment === 'delivery' && !location) {
    errors.location = 'Ingresa la ubicación de entrega.';
  }

  return errors;
}

function isValidIsoDate(value: string): boolean {
  try {
    return addCalendarDays(value, 0) === value;
  } catch {
    return false;
  }
}
