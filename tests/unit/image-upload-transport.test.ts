import { afterEach, expect, it, vi } from 'vitest';
import { prepareImageUpload } from '@/lib/image-upload-transport';
afterEach(() => vi.unstubAllGlobals());
it('preserves the original file when it fits the platform limit', async () => {
  const file = new File(['image'], 'product.png', { type: 'image/png' });
  expect(await prepareImageUpload(file, 4 * 1024 * 1024)).toBe(file);
});
it('optimizes an accepted large original to WebP below the transport ceiling', async () => {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', async () => ({
    width: 2400,
    height: 1600,
    close,
  }));
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback: (blob: Blob) => void) =>
        callback(new Blob(['webp'], { type: 'image/webp' })),
    }),
  });
  const file = new File([new Uint8Array(5 * 1024 * 1024)], 'large.png', {
    type: 'image/png',
  });
  const result = await prepareImageUpload(file, 4 * 1024 * 1024);
  expect(result.name).toBe('product.webp');
  expect(result.type).toBe('image/webp');
  expect(result.size).toBeLessThanOrEqual(4 * 1024 * 1024);
  expect(close).toHaveBeenCalledOnce();
});
it('rejects excessive pixel dimensions and releases the decoded image', async () => {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', async () => ({
    width: 10000,
    height: 10000,
    close,
  }));
  const file = new File([new Uint8Array(5 * 1024 * 1024)], 'large.png', {
    type: 'image/png',
  });
  await expect(prepareImageUpload(file, 4 * 1024 * 1024)).rejects.toThrow();
  expect(close).toHaveBeenCalledOnce();
});
