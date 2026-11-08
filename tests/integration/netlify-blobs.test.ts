import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setEnvironmentContext } from '@netlify/blobs';
import { BlobsServer } from '@netlify/blobs/server';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
let server: BlobsServer;
let directory: string;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'guteli-blobs-test-'));
  server = new BlobsServer({
    directory,
    token: 'local-emulator-only',
    logger: () => undefined,
  });
  const address = await server.start();
  const url = `http://127.0.0.1:${address.port}`;
  setEnvironmentContext({
    siteID: randomUUID(),
    deployID: 'a'.repeat(24),
    token: 'local-emulator-only',
    edgeURL: url,
    uncachedEdgeURL: url,
    apiURL: url,
  });
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await server?.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

it('uses the real SDK against the official local emulator for durable CRUD and preview isolation', async () => {
  vi.stubEnv('GUTELI_DEPLOY_CONTEXT', 'production');
  vi.resetModules();
  const { NetlifyObjectStorage } =
    await import('@/server/storage/netlify-storage');
  const first = new NetlifyObjectStorage();
  expect(await first.checkAccess()).toBe(true);
  const body = new Uint8Array([1, 2, 3]);
  expect(await first.putIfMissing('products/a.webp', body)).toBe(true);
  expect(
    await new NetlifyObjectStorage().putIfMissing(
      'products/a.webp',
      new Uint8Array([8]),
    ),
  ).toBe(false);
  expect(await new NetlifyObjectStorage().read('products/a.webp')).toEqual(
    Buffer.from(body),
  );
  await expect(first.read('products/a.webp', 2)).rejects.toThrow(
    'Unable to read object.',
  );
  vi.stubEnv('GUTELI_DEPLOY_CONTEXT', 'deploy-preview');
  vi.resetModules();
  const { NetlifyObjectStorage: PreviewStorage } =
    await import('@/server/storage/netlify-storage');
  const preview = new PreviewStorage();
  expect(await preview.read('products/a.webp')).toBeNull();
  expect(await preview.delete('products/a.webp')).toBe(false);
  expect(await first.read('products/a.webp')).toEqual(Buffer.from(body));
  expect(await first.delete('products/a.webp')).toBe(true);
  expect(await first.read('products/a.webp')).toBeNull();
  expect(await first.delete('products/a.webp')).toBe(false);
});
