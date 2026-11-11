import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { readBoundedJson } from '@/server/http/read-bounded-json';

function streamedRequest(chunks: Uint8Array[], failOnTail = false) {
  let index = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (index < chunks.length) controller.enqueue(chunks[index++]);
        else if (failOnTail)
          controller.error(new Error('Unexpected body tail read'));
        else controller.close();
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const request = new Request('https://bakery.example/api/checkout-review', {
    method: 'POST',
    body: stream,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  return { request, stream, wasCancelled: () => cancelled };
}

describe('bounded order JSON input', () => {
  it('accepts an exact byte-budget body with a UTF-8 character split across chunks', async () => {
    const input = streamedRequest([
      new Uint8Array([0x22, 0xc3]),
      new Uint8Array([0xa9, 0x22]),
    ]);
    expect(await readBoundedJson(input.request, 4)).toBe('é');
    expect(input.stream.locked).toBe(false);
  });
  it('counts bytes cumulatively across chunks and cancels before reading the tail', async () => {
    const input = streamedRequest(
      [new TextEncoder().encode('   '), new TextEncoder().encode('  ')],
      true,
    );
    await expect(readBoundedJson(input.request, 4)).rejects.toMatchObject({
      kind: 'too_large',
    });
    expect(input.wasCancelled()).toBe(true);
    expect(input.stream.locked).toBe(false);
  });
  it('rejects malformed UTF-8 rather than accepting replacement characters in evidence', async () => {
    const input = streamedRequest([new Uint8Array([0x22, 0xc3, 0x22])]);
    await expect(readBoundedJson(input.request, 4)).rejects.toMatchObject({
      kind: 'malformed',
    });
    expect(input.stream.locked).toBe(false);
  });
  it('releases the stream reader when JSON decoding fails', async () => {
    const input = streamedRequest([new TextEncoder().encode('{')]);
    await expect(readBoundedJson(input.request, 4)).rejects.toMatchObject({
      kind: 'malformed',
    });
    expect(input.stream.locked).toBe(false);
  });
  it('releases the stream reader when the transport fails', async () => {
    const input = streamedRequest([], true);
    await expect(readBoundedJson(input.request, 4)).rejects.toThrow(
      'Unexpected body tail read',
    );
    expect(input.stream.locked).toBe(false);
  });
});
