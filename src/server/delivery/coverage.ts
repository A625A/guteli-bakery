import { z } from 'zod';

import { deliveryPointSchema } from '@/domain/delivery';
export { deliveryPointSchema, type DeliveryPoint } from '@/domain/delivery';
export type DeliveryClassification =
  | {
      kind: 'automatic';
      shippingMinor: 1000 | 3500;
      areaId: string;
      version: string;
    }
  | {
      kind: 'manual';
      shippingMinor: null;
      reason:
        'unavailable' | 'outside' | 'boundary' | 'ambiguous' | 'invalid_point';
    };
const position = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
]);
const ring = z.array(position).min(4).max(512);
const polygon = z.array(ring).min(1).max(16);
const schema = z
  .object({
    type: z.literal('FeatureCollection'),
    version: z.string().min(1).max(80),
    features: z
      .array(
        z
          .object({
            type: z.literal('Feature'),
            properties: z
              .object({
                id: z.string().min(1).max(80),
                label: z.string().min(1).max(160),
                tariff: z.enum(['CAES', 'CAPITAL']),
                source: z.string().min(1),
                license: z.string().min(1),
                approval: z.string().min(1),
                boundary: z.enum(['manual', 'include']).default('manual'),
              })
              .strict(),
            geometry: z.discriminatedUnion('type', [
              z
                .object({ type: z.literal('Polygon'), coordinates: polygon })
                .strict(),
              z
                .object({
                  type: z.literal('MultiPolygon'),
                  coordinates: z.array(polygon).min(1).max(32),
                })
                .strict(),
            ]),
          })
          .strict(),
      )
      .max(64),
  })
  .strict();
type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];
const EPS = 1e-10; // Conservative boundary tolerance in degrees, never a coverage radius.
const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
const cross = (a: Position, b: Position, c: Position) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function onSegment(p: Position, a: Position, b: Position) {
  return (
    Math.abs(cross(a, b, p)) <= EPS &&
    p[0] >= Math.min(a[0], b[0]) - EPS &&
    p[0] <= Math.max(a[0], b[0]) + EPS &&
    p[1] >= Math.min(a[1], b[1]) - EPS &&
    p[1] <= Math.max(a[1], b[1]) + EPS
  );
}
function intersects(a: Position, b: Position, c: Position, d: Position) {
  if (
    onSegment(a, c, d) ||
    onSegment(b, c, d) ||
    onSegment(c, a, b) ||
    onSegment(d, a, b)
  )
    return true;
  return (
    cross(a, b, c) > 0 !== cross(a, b, d) > 0 &&
    cross(c, d, a) > 0 !== cross(c, d, b) > 0
  );
}
function inRing(p: Position, r: Ring): 'inside' | 'outside' | 'boundary' {
  let inside = false;
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i],
      b = r[i + 1];
    if (onSegment(p, a, b)) return 'boundary';
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}
function inPolygon(p: Position, poly: Polygon) {
  const outer = inRing(p, poly[0]);
  if (outer !== 'inside') return outer;
  for (const hole of poly.slice(1)) {
    const result = inRing(p, hole);
    if (result === 'boundary') return result;
    if (result === 'inside') return 'outside';
  }
  return 'inside';
}
function ringsIntersect(a: Ring, b: Ring) {
  return a
    .slice(0, -1)
    .some((p, i) =>
      b.slice(0, -1).some((q, j) => intersects(p, a[i + 1], q, b[j + 1])),
    );
}
function validRing(r: Ring) {
  if (!same(r[0], r.at(-1)!)) return false;
  let area = 0;
  for (let i = 0; i < r.length - 1; i++) {
    if (same(r[i], r[i + 1]) || Math.abs(r[i][0] - r[i + 1][0]) > 180)
      return false;
    area += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    for (let j = i + 1; j < r.length - 1; j++) {
      if (j === i + 1 || (i === 0 && j === r.length - 2)) continue;
      if (intersects(r[i], r[i + 1], r[j], r[j + 1])) return false;
    }
  }
  return Math.abs(area) > EPS;
}
function validPolygon(poly: Polygon) {
  if (!poly.every(validRing)) return false;
  for (let i = 1; i < poly.length; i++) {
    if (
      inRing(poly[i][0], poly[0]) !== 'inside' ||
      ringsIntersect(poly[0], poly[i])
    )
      return false;
    for (let j = 1; j < i; j++)
      if (
        ringsIntersect(poly[i], poly[j]) ||
        inRing(poly[i][0], poly[j]) !== 'outside' ||
        inRing(poly[j][0], poly[i]) !== 'outside'
      )
        return false;
  }
  return true;
}
function polygonsTouchOrOverlap(a: Polygon, b: Polygon) {
  return (
    a.some((r) => b.some((s) => ringsIntersect(r, s))) ||
    inPolygon(a[0][0], b) !== 'outside' ||
    inPolygon(b[0][0], a) !== 'outside'
  );
}
const manual = (
  reason: Extract<DeliveryClassification, { kind: 'manual' }>['reason'],
): DeliveryClassification => ({ kind: 'manual', shippingMinor: null, reason });

/** Only server-owned versioned data enters here. Invalid catalogues fail closed. */
export function compileCoverage(raw: unknown) {
  const parsed = schema.safeParse(raw);
  const data = parsed.success ? parsed.data : null;
  const areas =
    data?.features.map((f) => ({
      ...f.properties,
      polygons:
        f.geometry.type === 'Polygon'
          ? [f.geometry.coordinates]
          : f.geometry.coordinates,
    })) ?? [];
  // Bound validation work; larger real datasets must be reviewed/simplified first.
  const vertexCount = areas
    .flatMap((a) => a.polygons)
    .flat()
    .reduce((n, r) => n + r.length, 0);
  let valid =
    Boolean(data) &&
    vertexCount <= 4096 &&
    new Set(areas.map((a) => a.id)).size === areas.length;
  for (const a of valid ? areas : []) {
    if (!a.polygons.every(validPolygon)) valid = false;
    for (let i = 0; i < a.polygons.length; i++)
      for (let j = 0; j < i; j++)
        if (polygonsTouchOrOverlap(a.polygons[i], a.polygons[j])) valid = false;
  }
  // Conservative admission: conflicting tariffs may not even share a boundary.
  // An approved shared edge needs separate explicit treatment before admission.
  for (let i = 0; valid && i < areas.length; i++)
    for (let j = 0; j < i; j++) {
      if (
        areas[i].tariff !== areas[j].tariff &&
        areas[i].polygons.some((a) =>
          areas[j].polygons.some((b) => polygonsTouchOrOverlap(a, b)),
        )
      )
        valid = false;
    }
  return {
    valid,
    version: data?.version ?? 'unavailable',
    classify(point: unknown): DeliveryClassification {
      if (!valid || !areas.length) return manual('unavailable');
      const parsedPoint = deliveryPointSchema.safeParse(point);
      if (!parsedPoint.success) return manual('invalid_point');
      const p: Position = [parsedPoint.data.lng, parsedPoint.data.lat];
      const matches = areas.filter((a) =>
        a.polygons.some((poly) => inPolygon(p, poly) !== 'outside'),
      );
      if (!matches.length) return manual('outside');
      if (
        matches.some(
          (a) =>
            a.boundary !== 'include' &&
            a.polygons.some((poly) => inPolygon(p, poly) === 'boundary'),
        )
      )
        return manual('boundary');
      if (new Set(matches.map((a) => a.tariff)).size !== 1)
        return manual('ambiguous');
      const a = matches.sort((a, b) => a.id.localeCompare(b.id))[0];
      return {
        kind: 'automatic',
        shippingMinor: a.tariff === 'CAES' ? 1000 : 3500,
        areaId: a.id,
        version: data!.version,
      };
    },
  };
}
