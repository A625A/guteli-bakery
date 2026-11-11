import 'server-only';

export class BoundedJsonBodyError extends Error {
  constructor(readonly kind: 'malformed' | 'too_large') {
    super(kind);
  }
}

/** Enforce the byte budget before buffering; preserve raw auth form/JSON bytes. */
export async function readBoundedBytes(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new BoundedJsonBodyError('too_large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Decode JSON only after enforcing the byte budget while streaming. */
export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const bytes = await readBoundedBytes(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new BoundedJsonBodyError('malformed');
  }
}
