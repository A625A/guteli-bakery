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

  it('adds security headers without changing the asset response', async () => {
    const workerModule = await import('../../hosting/sites-worker');
    const request = new Request('https://guteli.example/menu/');
    const response = await workerModule.default.fetch(request, {
      ASSETS: {
        async fetch() {
          return new Response('secure menu export', {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Cache-Control': 'public, max-age=300',
              'Content-Security-Policy': 'default-src *',
              'Content-Type': 'text/html; charset=utf-8',
              ETag: '"asset-v1"',
            },
          });
        },
      },
    });

    expect(response.status).toBe(206);
    expect(response.statusText).toBe('Partial Content');
    expect(await response.text()).toBe('secure menu export');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    );
    expect(response.headers.get('etag')).toBe('"asset-v1"');
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' data:; manifest-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
    );
    expect(response.headers.get('strict-transport-security')).toBe(
      'max-age=31536000',
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    );
    expect(response.headers.get('permissions-policy')).toBe(
      'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    );
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-xss-protection')).toBe('0');
  });

  it('defines the same security policy for static asset responses', async () => {
    const source = await readFile('public/_headers', 'utf8').catch(() => '');
    const [pathPattern, ...headerLines] = source.trim().split('\n');
    const headers = Object.fromEntries(
      headerLines.map((line) => {
        const separator = line.indexOf(':');

        return [
          line.slice(0, separator).trim().toLowerCase(),
          line.slice(separator + 1).trim(),
        ];
      }),
    );

    expect(pathPattern).toBe('/*');
    expect(headers).toEqual({
      'content-security-policy':
        "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' data:; manifest-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
      'permissions-policy':
        'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'strict-transport-security': 'max-age=31536000',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '0',
    });
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
