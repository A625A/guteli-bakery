import { commercialOrdersEnabled } from '@/server/config/commerce';
import { CartView } from '@/components/cart/CartView';

export default function CartPage() {
  return <CartView commercialEnabled={commercialOrdersEnabled()} />;
}
