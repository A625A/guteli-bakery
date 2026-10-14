import type { AutomationSettings } from '@/server/notifications/automation-settings';
/** Deliberately fake values: only injected transports may use this fixture. */
export function automationSettings(now: Date): AutomationSettings {
  return {
    WHATSAPP_NOTIFICATIONS_ENABLED: 'true',
    WHATSAPP_WEBHOOKS_ENABLED: 'true',
    WHATSAPP_AUTOMATION_AUTHORIZED: 'true',
    WHATSAPP_ACCOUNT_READY: 'true',
    WHATSAPP_OWNER_CONSENT_CONFIRMED: 'true',
    WHATSAPP_AUTOMATION_CONTRACT_ACK: 'guteli-order-summary-v1',
    WHATSAPP_API_VERSION: 'v99.0',
    WHATSAPP_PHONE_NUMBER_ID: '123',
    WHATSAPP_BUSINESS_ACCOUNT_ID: '456',
    WHATSAPP_ACCESS_TOKEN: 'test-only-not-a-real-meta-token-123456789',
    WHATSAPP_APP_SECRET: 'test-only-webhook-signing-secret-123456789',
    WHATSAPP_VERIFY_TOKEN: 'test-only-verification-token-123456789',
    OWNER_WHATSAPP_DESTINATION: '50244441234',
    WHATSAPP_CUSTOMER_ORDER_TEMPLATE: 'customer_order',
    WHATSAPP_OWNER_ORDER_TEMPLATE: 'owner_order',
    WHATSAPP_APPROVED_TEMPLATE_LANGUAGE: 'es',
    WHATSAPP_TEMPLATE_BODY_MAX_CHARACTERS: 5000,
    WHATSAPP_SEND_AFTER: new Date(now.getTime() - 60000).toISOString(),
    WHATSAPP_MAX_QUEUE_AGE_SECONDS: 86400,
  };
}
