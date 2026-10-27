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
  expect(proposals).toHaveLength(15);
  expect(
    proposals
      .filter(
        (f: { properties: { tariff: string } }) =>
          f.properties.tariff === 'CAPITAL',
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
  expect(report.totalVertices).toBe(5704);
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
  expect(report.boundaryCases).toHaveLength(12);
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
  for (const name of ['San José Pinula', 'Santa Catarina Pinula']) {
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

it('Fraijanes north clips the original at mid-latitude without including the south', () => {
  const features = read('areas.geojson').features;
  const original = features.find(
    (f: { properties: { id: string } }) => f.properties.id === 'osm-9624941',
  );
  const north = features.find(
    (f: { properties: { id: string } }) =>
      f.properties.id === 'fraijanes-north',
  );
  const ring: number[][] = original.geometry.coordinates[0];
  const minLat = Math.min(...ring.map((p) => p[1]));
  const maxLat = Math.max(...ring.map((p) => p[1]));
  const minLng = Math.min(...ring.map((p) => p[0]));
  const maxLng = Math.max(...ring.map((p) => p[0]));
  const cut = (minLat + maxLat) / 2;
  expect(north.properties.derivation.latitude).toBe(cut);
  const clipped: number[][] = north.geometry.coordinates[0];
  expect(clipped.every((p) => p[1] >= cut)).toBe(true);
  const intersections = clipped.slice(0, -1).filter((p) => p[1] === cut);
  expect(intersections).toHaveLength(2);
  for (const point of clipped.filter((p) => p[1] !== cut))
    expect(ring).toContainEqual(point);
  const compile = (geometry: unknown) =>
    compileCoverage({
      type: 'FeatureCollection',
      version: 'test-cut',
      features: [
        {
          type: 'Feature',
          geometry,
          properties: {
            id: 'fraijanes',
            label: 'Test',
            tariff: 'CAES',
            source: original.properties.source,
            license: 'ODbL-1.0',
            approval: 'test only',
            boundary: 'manual',
          },
        },
      ],
    });
  const source = compile(original.geometry),
    derived = compile(north.geometry);
  expect(source.valid && derived.valid).toBe(true);
  let inside = 0,
    excluded = 0;
  for (let x = 1; x < 20; x++)
    for (let y = 1; y < 20; y++) {
      const point = {
        lng: minLng + ((maxLng - minLng) * x) / 20,
        lat: minLat + ((maxLat - minLat) * y) / 20,
      };
      if (Math.abs(point.lat - cut) < 1e-9) continue;
      const wasInside = source.classify(point).kind === 'automatic';
      expect(derived.classify(point).kind === 'automatic').toBe(
        wasInside && point.lat > cut,
      );
      if (wasInside) {
        if (point.lat > cut) inside++;
        else excluded++;
      }
    }
  expect(inside).toBeGreaterThan(0);
  expect(excluded).toBeGreaterThan(0);
  const middle = {
    lng: (intersections[0][0] + intersections[1][0]) / 2,
    lat: cut,
  };
  expect(derived.classify(middle)).toMatchObject({
    kind: 'manual',
    reason: 'boundary',
  });
});
