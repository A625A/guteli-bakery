import {
  commercialOrdersEnabled,
  commercialDemoResponse,
} from '@/server/config/commerce';
import { providerEnabled, readBoundedBody } from '@/server/delivery/provider';
import { deliveryRateLimit } from '@/server/delivery/http';
import { privateHeaders } from '@/server/privacy/headers';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  if (!commercialOrdersEnabled()) return commercialDemoResponse();
  const unavailable = () =>
    new Response(null, { status: 503, headers: privateHeaders });
  if (!providerEnabled() || !process.env.GEOAPIFY_MAPS_KEY)
    return unavailable();
  try {
    // Tiles are requested only by the opt-in same-origin map. No open proxy.
    if (request.headers.get('sec-fetch-site') !== 'same-origin')
      return new Response(null, { status: 403, headers: privateHeaders });
    const { z, x, y } = await params;
    if (
      ![z, x, y].every((v) => /^\d{1,7}$/.test(v)) ||
      +z > 19 ||
      +x >= 2 ** +z ||
      +y >= 2 ** +z
    )
      return new Response(null, { status: 400, headers: privateHeaders });
    if (!(await deliveryRateLimit(request, true)))
      return new Response(null, { status: 429, headers: privateHeaders });
    const url = new URL(
      `https://maps.geoapify.com/v1/tile/osm-carto/${z}/${x}/${y}.png`,
    );
    url.searchParams.set('apiKey', process.env.GEOAPIFY_MAPS_KEY);
    const response = await fetch(url, {
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (
      !response.ok ||
      response.headers.get('content-type')?.split(';')[0] !== 'image/png'
    )
      return unavailable();
    return new Response(await readBoundedBody(response.body, 512 * 1024), {
      headers: {
        ...privateHeaders,
        'content-type': 'image/png',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return unavailable();
  }
}
