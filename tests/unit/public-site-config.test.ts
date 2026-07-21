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

  it('enables the confirmed live destination only with explicit false', () => {
    expect(
      resolvePublicSiteConfig({
        demoMode: 'false',
        whatsappDestination: '50242569861',
      }),
    ).toEqual({
      isDemoMode: false,
      handoff: { kind: 'live', destination: '50242569861' },
    });
  });

  it.each([
    undefined,
    '',
    '502 4256-9861',
    '+50242569861',
    '1234567',
    '50255555555',
  ])(
    'fails closed when a live destination is invalid: %s',
    (whatsappDestination) => {
      expect(
        resolvePublicSiteConfig({ demoMode: 'false', whatsappDestination }),
      ).toEqual({ isDemoMode: false, handoff: { kind: 'unavailable' } });
    },
  );
});
