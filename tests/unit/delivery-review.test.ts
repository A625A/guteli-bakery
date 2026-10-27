import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { compileCoverage } from '@/server/delivery/coverage';
const root = new URL('../../data/delivery-review/', import.meta.url);
const read = (name: string) =>
  JSON.parse(readFileSync(new URL(name, root), 'utf8'));
it('review contains exactly the requested real proposals, all unapproved, with consistent source hashes', () => {
  const manifest = read('manifest.json');
  expect(manifest.productionEnabled).toBe(false);
  for (const [name, hash] of Object.entries(manifest.sources))
    expect(
      createHash('sha256')
        .update(readFileSync(new URL('sources/' + name, root)))
        .digest('hex'),
    ).toBe(hash);
  for (const [name, hash] of Object.entries(manifest.layers))
    expect(
      createHash('sha256')
        .update(readFileSync(new URL(name, root)))
        .digest('hex'),
    ).toBe(hash);
  const proposals = read('areas.geojson').features.filter(
    (f: { properties: { role: string } }) => f.properties.role === 'proposal',
  );
  expect(proposals).toHaveLength(17);
  expect(
    proposals
      .filter(
        (f: { properties: { zone?: number } }) => f.properties.zone != null,
      )
      .map((f: { properties: { zone: number } }) => f.properties.zone)
      .sort((a: number, b: number) => a - b),
  ).toEqual([1, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  for (const f of proposals) {
    expect(f.properties.status).toBe('proposed');
    expect(f.properties.license).toBe(
      f.properties.id.startsWith('gb-') ? 'CC-BY-3.0-IGO' : 'ODbL-1.0',
    );
    expect(f.properties.source).toMatch(
      /^https:\/\/(www.openstreetmap.org\/relation\/\d+|www.geoboundaries.org\/api\/current\/gbOpen\/GTM\/ADM2\/)$/,
    );
  }
  expect(manifest.pending.map((a: { id: string }) => a.id)).toEqual([
    'caes-corridor',
    'sausalito',
    'pavon',
  ]);
});
it('original real geometries honestly report classifier limits without silently simplifying them', () => {
  const report = read('validation.json');
  expect(report.totalVertices).toBe(5965);
  expect(report.combinedClassifierCompatible).toBe(false);
  const proposals = read('areas.geojson').features.filter(
    (f: { properties: { role: string } }) => f.properties.role === 'proposal',
  );
  for (const f of proposals) {
    const p = f.properties;
    const c = compileCoverage({
      type: 'FeatureCollection',
      version: 'test-review',
      features: [
        {
          type: 'Feature',
          geometry: f.geometry,
          properties: {
            id: p.id,
            label: p.name,
            tariff: p.tariff,
            source: p.source,
            license: p.license,
            approval: 'test only',
            boundary: 'manual',
          },
        },
      ],
    });
    expect(c.valid).toBe(
      report.areas.find((a: { id: string }) => a.id === p.id)
        .classifierCompatible,
    );
  }
});
it('review cannot be imported as a production coverage catalogue', () => {
  expect(compileCoverage(read('areas.geojson')).valid).toBe(false);
  expect(
    readFileSync(
      new URL('../../src/server/delivery/service.ts', import.meta.url),
      'utf8',
    ),
  ).toContain('features: []');
});

it('real boundary probes stay manual and no reference is represented as commercial approval', () => {
  const report = read('validation.json');
  expect(report.boundaryCases).toHaveLength(14);
  for (const row of report.boundaryCases)
    expect(row.result).toMatchObject({
      kind: 'manual',
      reason: 'boundary',
      shippingMinor: null,
    });
  for (const row of report.referenceCases)
    expect(row.commercialResult).toBe(
      'ENVIO_POR_CONFIRMAR_NO_APPROVED_COVERAGE',
    );
  expect(
    report.referenceCases.find((r: { name: string }) =>
      r.name.includes('Villa Nueva'),
    ).compatibleGeometryMatches,
  ).toEqual([]);
});

it('Pinula proposals preserve source boundaries and whole Fraijanes is no longer Q10', () => {
  const areas = read('areas.geojson').features;
  const context = read('sources/municipal-context.geojson').features;
  for (const name of ['Santa Catarina Pinula']) {
    const proposal = areas.find(
      (f: { properties: Record<string, string>; geometry: unknown }) =>
        f.properties.name === name,
    );
    expect(proposal.properties).toMatchObject({
      tariff: 'CAES',
      status: 'proposed',
      role: 'proposal',
    });
    expect(proposal.geometry).toEqual(
      context.find(
        (f: { properties: Record<string, string>; geometry: unknown }) =>
          f.properties.shapeName === name,
      ).geometry,
    );
  }
  expect(
    areas.find(
      (f: { properties: Record<string, string>; geometry: unknown }) =>
        f.properties.id === 'osm-9624941',
    ).properties,
  ).toMatchObject({ role: 'context', tariff: null });
  expect(
    areas.find(
      (a: { properties: { id: string } }) =>
        a.properties.id === 'fraijanes-north',
    ).properties,
  ).toMatchObject({ tariff: 'CAES', status: 'proposed' });
});

it.each([
  {
    name: 'Fraijanes',
    axis: 1,
    ratio: 0.5,
    aboveId: 'fraijanes-north',
    belowId: 'fraijanes-south',
    aboveTariff: 'CAES',
    belowTariff: 'CAPITAL',
  },
  {
    name: 'San José Pinula',
    axis: 0,
    ratio: 0.75,
    aboveId: 'gb-79465075B29005595464714-east',
    belowId: 'gb-79465075B29005595464714-west',
    aboveTariff: 'CAPITAL',
    belowTariff: 'CAES',
  },
])(
  '$name partitions the source with the requested tariffs and shared manual boundary',
  ({ name, axis, ratio, aboveId, belowId, aboveTariff, belowTariff }) => {
    const features = read('areas.geojson').features;
    const find = (id: string) =>
      features.find(
        (f: { properties: { id: string } }) => f.properties.id === id,
      );
    const original =
      name === 'Fraijanes'
        ? find('osm-9624941')
        : read('sources/municipal-context.geojson').features.find(
            (f: { properties: { shapeName: string } }) =>
              f.properties.shapeName === name,
          );
    const above = find(aboveId),
      below = find(belowId);
    expect(above.properties).toMatchObject({
      tariff: aboveTariff,
      status: 'proposed',
    });
    expect(below.properties).toMatchObject({
      tariff: belowTariff,
      status: 'proposed',
    });
    const ring: number[][] = original.geometry.coordinates[0];
    const min = [0, 1].map((i) => Math.min(...ring.map((p) => p[i])));
    const max = [0, 1].map((i) => Math.max(...ring.map((p) => p[i])));
    const cut = min[axis] + (max[axis] - min[axis]) * ratio;
    const key = axis === 0 ? 'longitude' : 'latitude';
    for (const part of [above, below])
      expect(part.properties.derivation[key]).toBeCloseTo(cut, 12);
    const intersections: number[][] = above.geometry.coordinates[0]
      .slice(0, -1)
      .filter((p: number[]) => Math.abs(p[axis] - cut) < 1e-12);
    expect(intersections).toHaveLength(2);
    for (const part of [above, below]) {
      const r: number[][] = part.geometry.coordinates[0];
      expect(
        r.every((p) =>
          part === above ? p[axis] >= cut - 1e-12 : p[axis] <= cut + 1e-12,
        ),
      ).toBe(true);
      for (const point of r.filter((p) => Math.abs(p[axis] - cut) > 1e-12))
        expect(ring).toContainEqual(point);
    }
    const compile = (geometry: unknown, tariff: string) =>
      compileCoverage({
        type: 'FeatureCollection',
        version: 'test-cut',
        features: [
          {
            type: 'Feature',
            geometry,
            properties: {
              id: 'test-area',
              label: name,
              tariff,
              source: above.properties.source,
              license: above.properties.license,
              approval: 'test only',
              boundary: 'manual',
            },
          },
        ],
      });
    const source = compile(original.geometry, 'CAES'),
      upper = compile(above.geometry, aboveTariff),
      lower = compile(below.geometry, belowTariff);
    expect(source.valid && upper.valid && lower.valid).toBe(true);
    let aboveCount = 0,
      belowCount = 0;
    for (let x = 1; x < 20; x++)
      for (let y = 1; y < 20; y++) {
        const point = {
          lng: min[0] + ((max[0] - min[0]) * x) / 20,
          lat: min[1] + ((max[1] - min[1]) * y) / 20,
        };
        const coordinate = axis === 0 ? point.lng : point.lat;
        if (Math.abs(coordinate - cut) < 1e-9) continue;
        const inside = source.classify(point).kind === 'automatic';
        expect(upper.classify(point).kind === 'automatic').toBe(
          inside && coordinate > cut,
        );
        expect(lower.classify(point).kind === 'automatic').toBe(
          inside && coordinate < cut,
        );
        if (inside) {
          const isAbove = coordinate > cut;
          if (isAbove) aboveCount++;
          else belowCount++;
          expect((isAbove ? upper : lower).classify(point)).toMatchObject({
            shippingMinor:
              (isAbove ? aboveTariff : belowTariff) === 'CAES' ? 1000 : 3500,
          });
        }
      }
    expect(aboveCount).toBeGreaterThan(0);
    expect(belowCount).toBeGreaterThan(0);
    const middle = {
      lng: (intersections[0][0] + intersections[1][0]) / 2,
      lat: (intersections[0][1] + intersections[1][1]) / 2,
    };
    for (const compiled of [upper, lower])
      expect(compiled.classify(middle)).toMatchObject({
        kind: 'manual',
        reason: 'boundary',
      });
  },
);
