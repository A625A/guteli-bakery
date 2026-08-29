import { z } from 'zod';

import { addCalendarDays, getMinimumOrderDate } from '@/lib/date';

const anyControlCharacter = /[\u0000-\u001f\u007f-\u009f]/;
const disallowedMultilineControlCharacter =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
const approvedPhoneCharacters = /^[0-9+(). -]+$/;

export const orderRequestFieldLimits = {
  customerName: 100,
  phone: 30,
  deliveryLocation: 300,
  notes: 500,
} as const;

export function normalizeOrderText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/\p{Zs}/gu, ' ')
    .trim();
}

function safeText(
  maxLength: number,
  hasDisallowedCharacter: (value: string) => boolean,
) {
  return z
    .string()
    .transform(normalizeOrderText)
    .pipe(z.string().max(maxLength))
    .refine((value) => !hasDisallowedCharacter(value), {
      message: 'Contains unsupported control characters.',
    });
}

const customerNameSchema = safeText(
  orderRequestFieldLimits.customerName,
  (value) => anyControlCharacter.test(value),
).pipe(z.string().min(1));

const phoneSchema = safeText(orderRequestFieldLimits.phone, (value) =>
  anyControlCharacter.test(value),
)
  .pipe(z.string().min(1))
  .refine((value) => approvedPhoneCharacters.test(value), {
    message: 'Phone contains unsupported characters.',
  })
  .refine((value) => {
    const digitCount = value.replace(/\D/g, '').length;

    return digitCount >= 8 && digitCount <= 15;
  }, 'Phone must contain 8 through 15 digits.');

const isoLocalDateSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      try {
        return addCalendarDays(value, 0) === value;
      } catch {
        return false;
      }
    },
    { message: 'Expected a valid ISO calendar date.' },
  )
  .refine((value) => value >= getMinimumOrderDate(), {
    message: 'Requested date is before the minimum order date.',
  });

const deliveryLocationSchema = safeText(
  orderRequestFieldLimits.deliveryLocation,
  (value) => disallowedMultilineControlCharacter.test(value),
);

const notesSchema = safeText(orderRequestFieldLimits.notes, (value) =>
  disallowedMultilineControlCharacter.test(value),
);

const orderItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
  })
  .strict();

export const createOrderRequestSchema = z
  .object({
    customerName: customerNameSchema,
    phone: phoneSchema,
    fulfillment: z.enum(['pickup', 'delivery']),
    requestedDate: isoLocalDateSchema,
    deliveryLocation: deliveryLocationSchema.optional(),
    notes: notesSchema.optional(),
    items: z.array(orderItemSchema).min(1).max(30),
  })
  .strict()
  .superRefine((request, context) => {
    if (
      request.fulfillment === 'delivery' &&
      (!request.deliveryLocation ||
        request.deliveryLocation.trim().length === 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['deliveryLocation'],
        message: 'Delivery location is required for delivery orders.',
      });
    }

    const productIds = new Set<string>();
    request.items.forEach((item, index) => {
      if (productIds.has(item.productId)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'productId'],
          message: 'Each product can appear only once.',
        });
      }
      productIds.add(item.productId);
    });
  });

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
