import { z } from 'zod';

export const deliveryPointSchema = z
  .object({
    lng: z.number().finite().min(-180).max(180),
    lat: z.number().finite().min(-90).max(90),
  })
  .strict();
export type DeliveryPoint = z.infer<typeof deliveryPointSchema>;
export type DeliverySelection = {
  point: DeliveryPoint;
  token?: string;
  shippingMinor: number | null;
  expiresAt?: string;
};
