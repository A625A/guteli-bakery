import { z } from 'zod';
import { fromGuatemalaLocal } from '@/lib/promotion-time';

export const promotionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    scope: z.enum(['CATALOG', 'SELECTED']),
    productIds: z.array(z.string().uuid()).max(500),
    discountPercent: z.number().min(0.01).max(100).multipleOf(0.01),
    startsAtLocal: z.string(),
    endsAtLocal: z.string(),
    enabled: z.boolean(),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      new Set(input.productIds).size !== input.productIds.length ||
      (input.scope === 'CATALOG'
        ? input.productIds.length !== 0
        : input.productIds.length === 0)
    )
      context.addIssue({
        code: 'custom',
        message: 'Selecciona los productos de la promoción.',
      });
    try {
      if (
        fromGuatemalaLocal(input.endsAtLocal) <=
        fromGuatemalaLocal(input.startsAtLocal)
      )
        throw new Error();
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Revisa las fechas de inicio y fin en hora de Guatemala.',
      });
    }
  });
export type PromotionInput = z.infer<typeof promotionInputSchema>;
