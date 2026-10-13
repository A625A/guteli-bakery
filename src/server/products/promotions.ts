import 'server-only';
import { eq } from 'drizzle-orm';
import type { Promotion } from '@/domain/pricing';
import { promotions, promotionProducts } from '@/server/db/schema';
import type { OrdersTransaction } from '@/server/orders/types';

export async function readPromotions(
  database: Pick<OrdersTransaction, 'select'>,
): Promise<Promotion[]> {
  const rows = await database
    .select({ promotion: promotions, productId: promotionProducts.productId })
    .from(promotions)
    .leftJoin(
      promotionProducts,
      eq(promotionProducts.promotionId, promotions.id),
    );
  const mapped = new Map<string, Promotion & { productIds: string[] }>();
  for (const { promotion, productId } of rows) {
    let value = mapped.get(promotion.id);
    if (!value) {
      value = {
        ...promotion,
        startsAt: promotion.startsAt.toISOString(),
        endsAt: promotion.endsAt.toISOString(),
        productIds: [],
      };
      mapped.set(promotion.id, value);
    }
    if (productId) value.productIds.push(productId);
  }
  return [...mapped.values()];
}
