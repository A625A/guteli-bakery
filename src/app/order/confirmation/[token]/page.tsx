import {
  OrderConfirmation,
  OrderConfirmationNotFound,
} from '@/components/order/OrderConfirmation';
import { getReceipt } from '@/server/orders/get-receipt';

export const dynamic = 'force-dynamic';

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await getReceipt(token);

  return receipt ? (
    <OrderConfirmation receipt={receipt} />
  ) : (
    <OrderConfirmationNotFound />
  );
}
