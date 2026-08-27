import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const imageDirectory = path.join(process.cwd(), 'public', 'images');

describe('published image transfer budget', () => {
  it('keeps the homepage banners small enough for a quick first load', async () => {
    const desktop = await stat(path.join(imageDirectory, 'guteli-banner.webp'));
    const mobile = await stat(
      path.join(imageDirectory, 'guteli-banner-mobile.webp'),
    );

    expect(desktop.size).toBeLessThanOrEqual(100_000);
    expect(mobile.size).toBeLessThanOrEqual(60_000);
  });

  it('keeps every product photograph below the menu transfer budget', async () => {
    const productDirectory = path.join(imageDirectory, 'products');
    const productImages = (await readdir(productDirectory)).filter((file) =>
      file.endsWith('.webp'),
    );
    const sizes = await Promise.all(
      productImages.map(async (file) => ({
        file,
        size: (await stat(path.join(productDirectory, file))).size,
      })),
    );

    expect(productImages).toHaveLength(9);
    expect(sizes.filter(({ size }) => size > 70_000)).toEqual([]);
  });
});
