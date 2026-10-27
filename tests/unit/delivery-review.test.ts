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
  expect(proposals).toHaveLength(13);
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
    expect(f.properties.license).toBe('ODbL-1.0');
    expect(f.properties.source).toMatch(
      /^https:\/\/www.openstreetmap.org\/relation\/\d+$/,
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
  expect(report.totalVertices).toBe(5656);
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
  expect(report.boundaryCases).toHaveLength(10);
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
