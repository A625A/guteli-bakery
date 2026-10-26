import 'server-only';
import { z } from 'zod';
import { deliveryPointSchema } from '@/domain/delivery';

export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  max: number,
) {
  if (!body) throw new Error('BODY_REQUIRED');
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new Error('BODY_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return bytes;
}
const responseSchema = z.object({
  results: z
    .array(
      z.object({
        formatted: z.string().max(500),
        lon: z.number(),
        lat: z.number(),
        country_code: z.string(),
      }),
    )
    .max(5),
});
export function providerEnabled() {
  return (
    process.env.DELIVERY_MAPS_ENABLED === 'true' &&
    process.env.DELIVERY_PROVIDER_APPROVED === 'true'
  );
}
export async function searchAddresses(
  address: string,
  consent: boolean,
  options = {
    enabled: providerEnabled(),
    key: process.env.GEOAPIFY_SEARCH_KEY ?? '',
    transport: fetch,
  },
) {
  const unavailable = { status: 'unavailable' as const, results: [] };
  if (
    !options.enabled ||
    !options.key ||
    !consent ||
    address.length < 3 ||
    address.length > 300
  )
    return unavailable;
  try {
    const url = new URL('https://api.geoapify.com/v1/geocode/search');
    url.search = new URLSearchParams({
      text: address,
      format: 'json',
      filter: 'countrycode:gt',
      lang: 'es',
      limit: '5',
      apiKey: options.key,
    }).toString();
    const result = await options.transport(url, {
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!result.ok) return unavailable;
    const payload = responseSchema.safeParse(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          await readBoundedBody(result.body, 64 * 1024),
        ),
      ),
    );
    if (!payload.success) return unavailable;
    return {
      status: 'ok' as const,
      results: payload.data.results.flatMap((r) => {
        const point = deliveryPointSchema.safeParse({ lng: r.lon, lat: r.lat });
        return r.country_code === 'gt' && point.success
          ? [{ label: r.formatted, point: point.data }]
          : [];
      }),
    };
  } catch {
    return unavailable;
  }
}
