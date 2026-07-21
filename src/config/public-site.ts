import { siteConfig } from '@/content/business';

export type PublicSiteEnvironment = {
  demoMode?: string;
  whatsappDestination?: string;
};

export type WhatsAppHandoff =
  | { kind: 'demo' }
  | { kind: 'live'; destination: string }
  | { kind: 'unavailable' };

export type PublicSiteConfig = {
  isDemoMode: boolean;
  handoff: WhatsAppHandoff;
};

export function resolvePublicSiteConfig(
  environment: PublicSiteEnvironment,
): PublicSiteConfig {
  const isDemoMode = environment.demoMode !== 'false';

  if (isDemoMode) {
    return { isDemoMode, handoff: { kind: 'demo' } };
  }

  if (
    environment.whatsappDestination &&
    environment.whatsappDestination === siteConfig.whatsappDigits
  ) {
    return {
      isDemoMode,
      handoff: {
        kind: 'live',
        destination: environment.whatsappDestination,
      },
    };
  }

  return { isDemoMode, handoff: { kind: 'unavailable' } };
}

export const publicSiteConfig = resolvePublicSiteConfig({
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE,
  whatsappDestination: process.env.NEXT_PUBLIC_WHATSAPP_DESTINATION,
});
