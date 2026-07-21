import { OrderRequest } from '@/components/order/OrderRequest';
import { publicSiteConfig } from '@/config/public-site';

export default function OrderPage() {
  return <OrderRequest handoff={publicSiteConfig.handoff} />;
}
