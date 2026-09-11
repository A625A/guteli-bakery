import 'server-only';

import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;

export type ProductImageValidationErrorCode =
  'INVALID_IMAGE' | 'IMAGE_TOO_LARGE' | 'IMAGE_DIMENSIONS_TOO_LARGE';

export class ProductImageValidationError extends Error {
  readonly code: ProductImageValidationErrorCode;

  constructor(code: ProductImageValidationErrorCode) {
    super(code);
    this.name = 'ProductImageValidationError';
    this.code = code;
  }
}

type DecodedFormat = 'jpeg' | 'png' | 'webp';

const FORMAT_CONTRACT = {
  jpeg: { mimeType: 'image/jpeg', extensions: new Set(['jpg', 'jpeg']) },
  png: { mimeType: 'image/png', extensions: new Set(['png']) },
  webp: { mimeType: 'image/webp', extensions: new Set(['webp']) },
} as const;

function invalid(): never {
  throw new ProductImageValidationError('INVALID_IMAGE');
}

function isStrictPng(bytes: Buffer) {
  if (
    bytes.length < 20 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return false;
  }
  let offset = 8;
  let first = true;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (first && type !== 'IHDR') return false;
    first = false;
    if (type === 'IEND') return length === 0 && end === bytes.length;
    offset = end;
  }
  return false;
}

function isStrictWebp(bytes: Buffer) {
  return (
    bytes.length >= 20 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP' &&
    bytes.readUInt32LE(4) + 8 === bytes.length
  );
}

function isStrictJpeg(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let offset = 2;
  let inScan = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      if (!inScan) return false;
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return false;
    const marker = bytes[offset];
    offset += 1;
    if (inScan && marker === 0x00) continue;
    if (inScan && marker >= 0xd0 && marker <= 0xd7) continue;
    if (marker === 0xd9) return offset === bytes.length;
    inScan = false;
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }
    if (offset + 2 > bytes.length) return false;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length)
      return false;
    offset += segmentLength;
    if (marker === 0xda) inScan = true;
  }
  return false;
}

function hasStrictContainer(format: DecodedFormat, bytes: Buffer) {
  if (format === 'jpeg') return isStrictJpeg(bytes);
  if (format === 'png') return isStrictPng(bytes);
  return isStrictWebp(bytes);
}

function extensionOf(filename: string) {
  const match = /\.([A-Za-z0-9]+)$/.exec(filename.trim());
  return match?.[1].toLowerCase() ?? '';
}

export async function validateAndTransformProductImage(
  input: Readonly<{
    bytes: Uint8Array;
    filename: string;
    declaredMimeType: string;
  }>,
) {
  const bytes = Buffer.from(input.bytes);
  if (bytes.length === 0) invalid();
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new ProductImageValidationError('IMAGE_TOO_LARGE');
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    metadata = await sharp(bytes, {
      failOn: 'error',
      limitInputPixels: false,
    }).metadata();
  } catch {
    invalid();
  }
  const format = metadata.format as DecodedFormat | undefined;
  if (
    !format ||
    !(format in FORMAT_CONTRACT) ||
    !hasStrictContainer(format, bytes)
  ) {
    invalid();
  }
  const contract = FORMAT_CONTRACT[format];
  if (
    input.declaredMimeType.trim().toLowerCase() !== contract.mimeType ||
    !contract.extensions.has(extensionOf(input.filename) as never)
  ) {
    invalid();
  }
  if (!metadata.width || !metadata.height) invalid();
  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new ProductImageValidationError('IMAGE_DIMENSIONS_TOO_LARGE');
  }

  try {
    const transformed = await sharp(bytes, {
      failOn: 'error',
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return {
      body: transformed.data,
      mimeType: 'image/webp' as const,
      width: transformed.info.width,
      height: transformed.info.height,
    } as const;
  } catch {
    invalid();
  }
}

type MultipartUpload = Readonly<{
  productId: string;
  expectedVersion: number;
  filename: string;
  declaredMimeType: string;
  bytes: Buffer;
}>;

function multipartBoundary(contentType: string | null) {
  const match =
    /^multipart\/form-data\s*;\s*boundary=(?:"([^"]+)"|([^;\s]+))\s*$/i.exec(
      contentType ?? '',
    );
  const boundary = match?.[1] ?? match?.[2];
  if (!boundary || boundary.length > 70 || !/^[\x21-\x7e]+$/.test(boundary))
    invalid();
  return boundary;
}

function parsePartHeaders(block: Buffer) {
  if (block.length > 8 * 1024) invalid();
  const lines = block.toString('utf8').split('\r\n');
  const headers = new Map<string, string>();
  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator <= 0) invalid();
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (headers.has(name)) invalid();
    headers.set(name, value);
  }
  if (
    [...headers.keys()].some(
      (name) => !['content-disposition', 'content-type'].includes(name),
    )
  ) {
    invalid();
  }
  const disposition = headers.get('content-disposition') ?? '';
  const match =
    /^form-data;\s*name="([A-Za-z][A-Za-z0-9]*)"(?:;\s*filename="([^"\r\n]{1,255})")?$/.exec(
      disposition,
    );
  if (!match) invalid();
  return {
    name: match[1],
    filename: match[2],
    contentType: headers.get('content-type'),
  } as const;
}

export async function readProductImageMultipart(
  request: Request,
): Promise<MultipartUpload> {
  const boundary = multipartBoundary(request.headers.get('content-type'));
  const initial = Buffer.from(`--${boundary}\r\n`);
  const delimiter = Buffer.from(`\r\n--${boundary}`);
  const reader = request.body?.getReader();
  if (!reader) invalid();

  let buffered = Buffer.alloc(0);
  let totalBytes = 0;
  let state: 'initial' | 'headers' | 'body' | 'delimiter' | 'done' = 'initial';
  let current: ReturnType<typeof parsePartHeaders> | null = null;
  let currentChunks: Buffer[] = [];
  let currentBytes = 0;
  let file: Pick<
    MultipartUpload,
    'filename' | 'declaredMimeType' | 'bytes'
  > | null = null;
  const fields = new Map<string, string>();

  const appendPart = (chunk: Buffer) => {
    if (!current || chunk.length === 0) return;
    currentBytes += chunk.length;
    const maximum = current.filename ? MAX_IMAGE_BYTES : 256;
    if (currentBytes > maximum) {
      throw new ProductImageValidationError(
        current.filename ? 'IMAGE_TOO_LARGE' : 'INVALID_IMAGE',
      );
    }
    currentChunks.push(chunk);
  };
  const finishPart = () => {
    if (!current) invalid();
    const value = Buffer.concat(currentChunks, currentBytes);
    if (current.filename) {
      if (
        current.name !== 'file' ||
        !current.contentType ||
        file ||
        value.length === 0
      )
        invalid();
      file = {
        filename: current.filename,
        declaredMimeType: current.contentType,
        bytes: value,
      };
    } else {
      if (
        current.contentType ||
        !['productId', 'expectedVersion'].includes(current.name)
      )
        invalid();
      if (fields.has(current.name)) invalid();
      fields.set(current.name, value.toString('utf8'));
    }
    current = null;
    currentChunks = [];
    currentBytes = 0;
  };

  try {
    while (state !== 'done') {
      const { value, done } = await reader.read();
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > MAX_MULTIPART_BYTES) {
          throw new ProductImageValidationError('IMAGE_TOO_LARGE');
        }
        buffered = Buffer.concat([buffered, Buffer.from(value)]);
      }

      let progressed = true;
      while (progressed) {
        progressed = false;
        if (state === 'initial' && buffered.length >= initial.length) {
          if (!buffered.subarray(0, initial.length).equals(initial)) invalid();
          buffered = buffered.subarray(initial.length);
          state = 'headers';
          progressed = true;
        }
        if (state === 'headers') {
          const end = buffered.indexOf('\r\n\r\n');
          if (end >= 0) {
            current = parsePartHeaders(buffered.subarray(0, end));
            buffered = buffered.subarray(end + 4);
            state = 'body';
            progressed = true;
          } else if (buffered.length > 8 * 1024) invalid();
        }
        if (state === 'body') {
          const end = buffered.indexOf(delimiter);
          if (end >= 0) {
            appendPart(buffered.subarray(0, end));
            finishPart();
            buffered = buffered.subarray(end + delimiter.length);
            state = 'delimiter';
            progressed = true;
          } else {
            const safeLength = buffered.length - delimiter.length + 1;
            if (safeLength > 0) {
              appendPart(buffered.subarray(0, safeLength));
              buffered = buffered.subarray(safeLength);
            }
          }
        }
        if (state === 'delimiter' && buffered.length >= 2) {
          if (buffered.subarray(0, 2).equals(Buffer.from('--'))) {
            buffered = buffered.subarray(2);
            state = 'done';
          } else if (buffered.subarray(0, 2).equals(Buffer.from('\r\n'))) {
            buffered = buffered.subarray(2);
            state = 'headers';
          } else invalid();
          progressed = true;
        }
      }
      if (done) break;
    }
    if (
      state !== 'done' ||
      (buffered.length && !buffered.equals(Buffer.from('\r\n')))
    )
      invalid();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof ProductImageValidationError) throw error;
    invalid();
  }

  const productId = fields.get('productId') ?? '';
  const versionText = fields.get('expectedVersion') ?? '';
  const expectedVersion = Number(versionText);
  const uploadedFile = file as Pick<
    MultipartUpload,
    'filename' | 'declaredMimeType' | 'bytes'
  > | null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      productId,
    ) ||
    !/^[1-9]\d*$/.test(versionText) ||
    !Number.isSafeInteger(expectedVersion) ||
    !uploadedFile
  ) {
    invalid();
  }
  return { productId, expectedVersion, ...uploadedFile };
}
