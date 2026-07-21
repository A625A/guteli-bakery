import { describe, expect, it } from 'vitest';

import { resolvePublicSiteConfig } from '@/config/public-site';

describe('public site configuration', () => {
  it.each([undefined, '', 'true', 'TRUE', '0', 'yes'])(
    'fails safely into demo mode for %s',
    (demoMode) => {
      expect(
        resolvePublicSiteConfig({
          demoMode,
          whatsappDestination: '50255555555',
        }),
      ).toEqual({ isDemoMode: true, handoff: { kind: 'demo' } });
    },
  );

  it('enables a configured live destination only with explicit false', () => {
    expect(
      resolvePublicSiteConfig({
        demoMode: 'false',
        whatsappDestination: '50255555555',
      }),
    ).toEqual({
      isDemoMode: false,
      handoff: { kind: 'live', destination: '50255555555' },
    });
  });

  it.each([undefined, '', '502 5555-5555', '+50255555555', '1234567'])(
    'fails closed when a live destination is invalid: %s',
    (whatsappDestination) => {
      expect(
        resolvePublicSiteConfig({ demoMode: 'false', whatsappDestination }),
      ).toEqual({ isDemoMode: false, handoff: { kind: 'unavailable' } });
    },
  );
});
