import { CartView } from '@/components/cart/CartView';
import { publicSiteConfig } from '@/config/public-site';

export default function CartPage() {
  return <CartView handoff={publicSiteConfig.handoff} />;
}
