import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const server = Array.isArray(base.webServer)
  ? base.webServer[0]
  : base.webServer!;
// Only this isolated browser suite enables handoff. window.open is intercepted;
// tests never send messages or visit WhatsApp. Payment flags stay disabled.
export default defineConfig({
  ...base,
  testMatch: 'checkout-summary.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3019' },
  webServer: {
    ...server,
    command: `${server.command} --port 3019`,
    url: 'http://127.0.0.1:3019',
    env: {
      ...server.env,
      BETTER_AUTH_URL: 'http://127.0.0.1:3019',
      NEXT_PUBLIC_DEMO_MODE:
        process.env.GUTELI_SUMMARY_DEMO === 'true' ? 'true' : 'false',
      NEXT_PUBLIC_WHATSAPP_DESTINATION: '50242569861',
      PAYMENTS_ENABLED: 'false',
      WHATSAPP_NOTIFICATIONS_ENABLED: 'false',
    },
  },
});
