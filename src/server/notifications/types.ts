import 'server-only';

export const OWNER_ORDER_TEMPLATE_CONTRACT_VERSION =
  'guteli-owner-order-created-v1' as const;

export type OwnerOrderSnapshot = Readonly<{
  publicId: string;
  customerName: string;
  phone: string;
  fulfillment: 'PICKUP' | 'DELIVERY';
  deliveryLocation: string | null;
  requestedDate: string;
  items: readonly Readonly<{
    productName: string;
    quantity: number;
  }>[];
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
  notes: string | null;
}>;

export type OwnerOrderMessage = Readonly<{
  templateContractVersion: typeof OWNER_ORDER_TEMPLATE_CONTRACT_VERSION;
  publicOrderId: string;
  bodyText: string;
  adminOrderUrl: string;
}>;

export type NotificationResult =
  | Readonly<{
      kind: 'accepted';
      code: 'PROVIDER_ACCEPTED';
      providerMessageId: string;
    }>
  | Readonly<{
      kind: 'disabled';
      code: 'NOT_CONFIGURED';
    }>
  | Readonly<{
      kind: 'retryable_failure';
      code:
        | 'PROVIDER_INVALID_RESPONSE'
        | 'PROVIDER_NETWORK_ERROR'
        | 'PROVIDER_RATE_LIMITED'
        | 'PROVIDER_TIMEOUT'
        | 'PROVIDER_UNAVAILABLE';
    }>
  | Readonly<{
      kind: 'permanent_failure';
      code:
        | 'PAYLOAD_UNREPRESENTABLE'
        | 'PROVIDER_REDIRECT_BLOCKED'
        | 'PROVIDER_REQUEST_REJECTED';
    }>;

export interface NotificationProvider {
  sendOwnerOrderCreated(
    message: OwnerOrderMessage,
  ): Promise<NotificationResult>;
}
