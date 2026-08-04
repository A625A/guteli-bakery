import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('Sites deployment contract', () => {
  it('links this checkout to the existing Güteli Sites project', async () => {
    const hosting = JSON.parse(
      await readFile('.openai/hosting.json', 'utf8'),
    ) as {
      project_id?: string;
      d1?: unknown;
      r2?: unknown;
    };

    expect(hosting).toEqual({
      project_id: 'appgprj_6a716f9889748191beb0b7d5227a4a99',
      d1: null,
      r2: null,
    });
  });

  it('serves the requested route through the Sites asset binding', async () => {
    const workerModule = await import('../../hosting/sites-worker').catch(
      () => ({
        default: undefined,
      }),
    );
    const worker = workerModule.default;

    expect(worker).toBeDefined();
    if (!worker) return;

    const assetRequests: Request[] = [];
    const request = new Request('https://guteli.example/menu/');
    const response = await worker.fetch(request, {
      ASSETS: {
        async fetch(assetRequest: Request) {
          assetRequests.push(assetRequest);
          return new Response('menu export', { status: 200 });
        },
      },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('menu export');
    expect(assetRequests).toEqual([request]);
  });

  it('provides the deployment build that packages the static export', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['build:sites']).toBe(
      'npm run build && node scripts/build-sites.mjs',
    );
    await expect(
      readFile('scripts/build-sites.mjs', 'utf8'),
    ).resolves.toContain("path.join(distributionDirectory, 'client')");
  });
});
