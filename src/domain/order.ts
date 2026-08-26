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

export const orderFieldLimits = {
  name: 100,
  phone: 30,
  location: 300,
  notes: 500,
} as const;

const anyControlCharacter = /[\u0000-\u001f\u007f-\u009f]/;
const disallowedMultilineControlCharacter =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
const allowedPhoneCharacters = /^[0-9+(). -]+$/;

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
  } else if (values.name.length > orderFieldLimits.name) {
    errors.name = 'Usa un nombre de hasta 100 caracteres.';
  } else if (anyControlCharacter.test(values.name)) {
    errors.name = 'El nombre contiene caracteres no permitidos.';
  }

  if (!phone) {
    errors.phone = 'Ingresa tu teléfono.';
  } else {
    const phoneDigits = phone.replace(/\D/g, '');

    if (
      values.phone.length > orderFieldLimits.phone ||
      !allowedPhoneCharacters.test(phone) ||
      anyControlCharacter.test(phone) ||
      phoneDigits.length < 8 ||
      phoneDigits.length > 15
    ) {
      errors.phone = 'Ingresa un teléfono válido de 8 a 15 dígitos.';
    }
  }

  if (!requestedDate) {
    errors.requestedDate = 'Selecciona una fecha.';
  } else if (!isValidIsoDate(requestedDate)) {
    errors.requestedDate = 'Selecciona una fecha válida.';
  } else if (requestedDate < minimumOrderDate) {
    errors.requestedDate = `Selecciona una fecha a partir del ${minimumOrderDate}.`;
  }

  if (values.fulfillment === 'delivery') {
    if (!location) {
      errors.location = 'Ingresa la ubicación de entrega.';
    } else if (values.location.length > orderFieldLimits.location) {
      errors.location = 'Usa una ubicación de hasta 300 caracteres.';
    } else if (disallowedMultilineControlCharacter.test(values.location)) {
      errors.location = 'La ubicación contiene caracteres no permitidos.';
    }
  }

  if (values.notes.length > orderFieldLimits.notes) {
    errors.notes = 'Usa notas de hasta 500 caracteres.';
  } else if (disallowedMultilineControlCharacter.test(values.notes)) {
    errors.notes = 'Las notas contienen caracteres no permitidos.';
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
