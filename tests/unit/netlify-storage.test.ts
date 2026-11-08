import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const provider = vi.hoisted(() => ({
  getStore: vi.fn(),
  getDeployStore: vi.fn(),
}));
vi.mock('@netlify/blobs', () => provider);
import { createObjectStorage } from '@/server/storage';

let objects: Map<string, Uint8Array>;
const env = {
  NODE_ENV: 'production',
  DEPLOYMENT_PLATFORM: 'netlify',
  STORAGE_PROVIDER: 'netlify-blobs',
} as NodeJS.ProcessEnv;
beforeEach(() => {
  objects = new Map();
  const store = {
    set: async (
      key: string,
      body: ArrayBuffer,
      options: { onlyIfNew?: boolean },
    ) => {
      if (options.onlyIfNew && objects.has(key)) return { modified: false };
      objects.set(key, new Uint8Array(body));
      return { modified: true };
    },
    get: async (key: string) =>
      objects.has(key)
        ? new Blob([Uint8Array.from(objects.get(key)!)]).stream()
        : null,
    getMetadata: async (key: string) =>
      objects.has(key) ? { metadata: {} } : null,
    delete: async (key: string) => {
      objects.delete(key);
    },
  };
  provider.getStore.mockReturnValue(store);
  provider.getDeployStore.mockReturnValue(store);
});
afterEach(() => vi.unstubAllEnvs());
it('persists across adapter instances and never replaces an existing object', async () => {
  const a = createObjectStorage(env),
    b = createObjectStorage(env);
  expect(await a.putIfMissing('products/a.webp', new Uint8Array([1, 2]))).toBe(
    true,
  );
  expect(await b.putIfMissing('products/a.webp', new Uint8Array([9]))).toBe(
    false,
  );
  expect(await b.read('products/a.webp')).toEqual(Buffer.from([1, 2]));
  expect(await b.delete('products/a.webp')).toBe(true);
  expect(await a.read('products/a.webp')).toBeNull();
  expect(await a.delete('products/a.webp')).toBe(false);
});
it('keeps private provider access behind the existing media route and initializes lazily', () => {
  provider.getStore.mockClear();
  provider.getDeployStore.mockClear();
  expect(createObjectStorage(env).publicUrl('products/a b.webp')).toBe(
    '/api/media/products/a%20b.webp',
  );
  expect(provider.getStore).not.toHaveBeenCalled();
  expect(provider.getDeployStore).not.toHaveBeenCalled();
});
it('rejects traversal, invalid limits, oversized and empty objects', async () => {
  const storage = createObjectStorage(env);
  for (const key of ['../secret', '/secret', 'a/../b', 'a\\b', 'a//b']) {
    await expect(storage.read(key)).rejects.toThrow();
  }
  await expect(
    storage.putIfMissing('empty', new Uint8Array()),
  ).rejects.toThrow();
  objects.set('large', new Uint8Array(20));
  await expect(storage.read('large', 10)).rejects.toThrow();
  await expect(storage.read('large', 0)).rejects.toThrow();
});
it('does not leak provider credentials in errors or fall back to local disk', async () => {
  provider.getDeployStore.mockImplementation(() => {
    throw new Error('secret-provider-token');
  });
  await expect(
    createObjectStorage(env).read('products/a.webp'),
  ).rejects.toThrow('Unable to read object.');
  expect(() =>
    createObjectStorage({ ...env, STORAGE_PROVIDER: 'local' }),
  ).toThrow();
  expect(() =>
    createObjectStorage({ ...env, STORAGE_PROVIDER: 'typo' }),
  ).toThrow();
});
