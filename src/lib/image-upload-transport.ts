import { OwnerUiError } from './owner-ui-error';

const MAX_ORIGINAL_BYTES = 8 * 1024 * 1024;
const transportLimit = Number(
  process.env.NEXT_PUBLIC_IMAGE_UPLOAD_TRANSPORT_LIMIT ?? MAX_ORIGINAL_BYTES,
);

/** Keep accepting 8 MB originals while fitting Netlify's binary request ceiling. */
export async function prepareImageUpload(
  file: File,
  maxBytes = transportLimit,
): Promise<File> {
  if (
    !file.size ||
    file.size > MAX_ORIGINAL_BYTES ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  ) {
    throw new OwnerUiError('Usá una imagen JPEG, PNG o WebP de hasta 8 MB.');
  }
  if (file.size <= maxBytes) return file;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 24_000_000
    )
      throw new Error();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error();
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.65]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', quality),
      );
      if (
        blob?.type === 'image/webp' &&
        blob.size > 0 &&
        blob.size <= maxBytes
      ) {
        return new File([blob], 'product.webp', { type: 'image/webp' });
      }
    }
    throw new Error();
  } catch {
    throw new OwnerUiError(
      'No pudimos preparar la fotografía. Probá con una imagen más pequeña.',
    );
  } finally {
    bitmap?.close();
  }
}
