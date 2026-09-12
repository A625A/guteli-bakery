import { createHash } from 'node:crypto';
import { link, lstat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  MAX_IMAGE_BYTES,
  MAX_MULTIPART_BYTES,
  ProductImageValidationError,
  readProductImageMultipart,
  validateAndTransformProductImage,
} from '@/server/storage/image-validation';
import { LocalObjectStorage } from '@/server/storage/local-storage';

const temporaryRoots: string[] = [];

async function fixture(
  format: 'jpeg' | 'png' | 'webp',
  options: Readonly<{
    width?: number;
    height?: number;
    metadata?: boolean;
  }> = {},
) {
  let image = sharp({
    create: {
      width: options.width ?? 32,
      height: options.height ?? 20,
      channels: 3,
      background: { r: 150, g: 75, b: 25 },
    },
  });
  if (options.metadata) {
    image = image.withMetadata({
      exif: { IFD0: { Artist: 'must-not-survive' } },
    });
  }
  return image[format]().toBuffer();
}

function multipartBody(
  parts: readonly Readonly<{
    name: string;
    value: string | Buffer;
    filename?: string;
    contentType?: string;
  }>[],
) {
  const boundary = 'guteli-test-boundary';
  const buffers = parts.flatMap((part) => {
    const disposition = part.filename
      ? `form-data; name="${part.name}"; filename="${part.filename}"`
      : `form-data; name="${part.name}"`;
    const headers = [
      `--${boundary}\r\n`,
      `Content-Disposition: ${disposition}\r\n`,
      ...(part.contentType ? [`Content-Type: ${part.contentType}\r\n`] : []),
      '\r\n',
    ];
    return [
      Buffer.from(headers.join('')),
      Buffer.from(part.value),
      Buffer.from('\r\n'),
    ];
  });
  buffers.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(buffers) } as const;
}

function multipartRequest(
  parts: Parameters<typeof multipartBody>[0],
  chunkSize = Number.POSITIVE_INFINITY,
) {
  const { boundary, body } = multipartBody(parts);
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < body.length; offset += chunkSize) {
    chunks.push(body.subarray(offset, offset + chunkSize));
  }
  return new Request('http://localhost/api/admin/uploads', {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body: new ReadableStream({
      pull(controller) {
        const next = chunks.shift();
        if (next) controller.enqueue(next);
        else controller.close();
      },
    }),
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

const validMultipartParts = (bytes: Buffer) =>
  [
    { name: 'productId', value: '123e4567-e89b-42d3-a456-426614174000' },
    { name: 'expectedVersion', value: '7' },
    {
      name: 'file',
      value: bytes,
      filename: 'product.png',
      contentType: 'image/png',
    },
  ] as const;

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('product image validation', () => {
  it.each([
    ['jpeg', 'image/jpeg', 'photo.jpg'],
    ['png', 'image/png', 'photo.png'],
    ['webp', 'image/webp', 'photo.webp'],
  ] as const)(
    'accepts decoded %s only when MIME and extension agree',
    async (format, declaredMimeType, filename) => {
      const result = await validateAndTransformProductImage({
        bytes: await fixture(format),
        declaredMimeType,
        filename,
      });

      expect(result.mimeType).toBe('image/webp');
      expect(result.width).toBe(32);
      expect(result.height).toBe(20);
      expect((await sharp(result.body).metadata()).format).toBe('webp');
    },
  );

  it.each([
    ['image/png', 'photo.png'],
    ['image/jpeg', 'photo.webp'],
    ['image/webp', 'photo.jpg'],
  ] as const)(
    'rejects MIME spoofing and extension spoofing',
    async (declaredMimeType, filename) => {
      await expect(
        validateAndTransformProductImage({
          bytes: await fixture('jpeg'),
          declaredMimeType,
          filename,
        }),
      ).rejects.toBeInstanceOf(ProductImageValidationError);
    },
  );

  it('rejects SVG and trailing polyglot content', async () => {
    const jpeg = await fixture('jpeg');
    for (const bytes of [
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      Buffer.concat([jpeg, Buffer.from('<script>alert(1)</script>')]),
    ]) {
      await expect(
        validateAndTransformProductImage({
          bytes,
          declaredMimeType: 'image/jpeg',
          filename: 'photo.jpg',
        }),
      ).rejects.toBeInstanceOf(ProductImageValidationError);
    }
  });

  it('rejects files over 8 MiB and decoded images over 24 megapixels', async () => {
    await expect(
      validateAndTransformProductImage({
        bytes: Buffer.alloc(MAX_IMAGE_BYTES + 1),
        declaredMimeType: 'image/png',
        filename: 'large.png',
      }),
    ).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
    await expect(
      validateAndTransformProductImage({
        bytes: await fixture('png', { width: 6_001, height: 4_000 }),
        declaredMimeType: 'image/png',
        filename: 'pixels.png',
      }),
    ).rejects.toMatchObject({ code: 'IMAGE_DIMENSIONS_TOO_LARGE' });
  });

  it('auto-orients, bounds dimensions, and strips EXIF from WebP output', async () => {
    const input = await fixture('jpeg', {
      width: 3_000,
      height: 1_500,
      metadata: true,
    });
    const result = await validateAndTransformProductImage({
      bytes: input,
      declaredMimeType: 'image/jpeg',
      filename: 'metadata.jpeg',
    });
    const metadata = await sharp(result.body).metadata();

    expect({ width: result.width, height: result.height }).toEqual({
      width: 2_400,
      height: 1_200,
    });
    expect(metadata).toMatchObject({
      format: 'webp',
      width: 2_400,
      height: 1_200,
    });
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
  });

  it('streams one multipart file with bounded metadata fields', async () => {
    const bytes = await fixture('png');
    const parsed = await readProductImageMultipart(
      multipartRequest(validMultipartParts(bytes), 17),
    );

    expect(parsed).toMatchObject({
      productId: '123e4567-e89b-42d3-a456-426614174000',
      expectedVersion: 7,
      filename: 'product.png',
      declaredMimeType: 'image/png',
    });
    expect(parsed.bytes.equals(bytes)).toBe(true);
  });

  it('accepts a terminal multipart CRLF split across chunks', async () => {
    const bytes = await fixture('png');
    const { boundary, body } = multipartBody(validMultipartParts(bytes));
    const chunks = [body.subarray(0, -1), body.subarray(-1)];
    const request = new Request('http://localhost/api/admin/uploads', {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body: new ReadableStream({
        pull(controller) {
          const next = chunks.shift();
          if (next) controller.enqueue(next);
          else controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    await expect(readProductImageMultipart(request)).resolves.toMatchObject({
      productId: '123e4567-e89b-42d3-a456-426614174000',
      expectedVersion: 7,
    });
  });

  it('reads through bounded EOF and cancels an oversized tail after the closing delimiter', async () => {
    const bytes = await fixture('png');
    const { boundary, body } = multipartBody(validMultipartParts(bytes));
    const chunks = [body, Buffer.alloc(MAX_MULTIPART_BYTES)];
    let cancelled = false;
    const request = new Request('http://localhost/api/admin/uploads', {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body: new ReadableStream({
        pull(controller) {
          const next = chunks.shift();
          if (next) controller.enqueue(next);
          else controller.close();
        },
        cancel() {
          cancelled = true;
        },
      }),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    await expect(readProductImageMultipart(request)).rejects.toMatchObject({
      code: 'IMAGE_TOO_LARGE',
    });
    expect(cancelled).toBe(true);
  });

  it('rejects multiple files and aborts an oversized chunked envelope', async () => {
    const bytes = await fixture('jpeg');
    await expect(
      readProductImageMultipart(
        multipartRequest([
          { name: 'productId', value: '123e4567-e89b-42d3-a456-426614174000' },
          { name: 'expectedVersion', value: '1' },
          {
            name: 'file',
            value: bytes,
            filename: 'one.jpg',
            contentType: 'image/jpeg',
          },
          {
            name: 'file',
            value: bytes,
            filename: 'two.jpg',
            contentType: 'image/jpeg',
          },
        ]),
      ),
    ).rejects.toBeInstanceOf(ProductImageValidationError);
    await expect(
      readProductImageMultipart(
        multipartRequest(
          [
            {
              name: 'productId',
              value: '123e4567-e89b-42d3-a456-426614174000',
            },
            { name: 'expectedVersion', value: '1' },
            {
              name: 'file',
              value: Buffer.alloc(MAX_IMAGE_BYTES + 1),
              filename: 'large.png',
              contentType: 'image/png',
            },
          ],
          64 * 1024,
        ),
      ),
    ).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
  });
});

describe('local object deletion', () => {
  it('is idempotent and refuses traversal, symlinks, and hardlinks', async () => {
    const root = await mkdtemp(join(tmpdir(), 'guteli-delete-test-'));
    temporaryRoots.push(root);
    const storage = new LocalObjectStorage(root);
    const key = 'products/123e4567-e89b-42d3-a456-426614174000.webp';
    expect(await storage.putIfMissing(key, Buffer.from('safe'))).toBe(true);
    expect(await storage.delete(key)).toBe(true);
    expect(await storage.delete(key)).toBe(false);
    await expect(storage.delete('../outside.webp')).rejects.toThrow();

    const linkedKey = 'products/223e4567-e89b-42d3-a456-426614174000.webp';
    await storage.putIfMissing(linkedKey, Buffer.from('linked'));
    const target = join(
      root,
      createHash('sha256').update(linkedKey).digest('hex'),
    );
    await link(target, join(root, 'second-link'));
    expect((await lstat(target)).nlink).toBe(2);
    await expect(storage.delete(linkedKey)).rejects.toThrow();
    expect((await lstat(target)).isFile()).toBe(true);
  });
});
