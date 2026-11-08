import { createDeliveryHandlers } from '@/server/delivery/http';
export const dynamic = 'force-dynamic';
export const POST = createDeliveryHandlers().quote;
