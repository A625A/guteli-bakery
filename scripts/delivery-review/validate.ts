/** Real geometry admission report only. Never emits a production catalogue. */
import { readFileSync, writeFileSync } from 'node:fs';
import { compileCoverage } from '../../src/server/delivery/coverage';
import type { FeatureCollection, Polygon, MultiPolygon, Point } from 'geojson';
const root = new URL('../../data/delivery-review/', import.meta.url);
const data = JSON.parse(
  readFileSync(new URL('areas.geojson', root), 'utf8'),
) as FeatureCollection<Polygon | MultiPolygon>;
const proposals = data.features.filter(
  (f) => f.properties?.role === 'proposal',
);
function candidate(f: (typeof proposals)[number]) {
  return {
    type: 'Feature',
    properties: {
      id: f.properties!.id,
      label: f.properties!.name,
      tariff: f.properties!.tariff,
      source: f.properties!.source,
      license: f.properties!.license,
      approval: 'STRUCTURAL CHECK ONLY; NOT OWNER APPROVAL',
      boundary: 'manual',
    },
    geometry: f.geometry,
  };
}
function catalogue(features: unknown[]) {
  return {
    type: 'FeatureCollection',
    version: 'review-structural-only',
    features,
  };
}
const areas = proposals.map((f) => {
  const rings =
    f.geometry.type === 'Polygon'
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat();
  const check = compileCoverage(catalogue([candidate(f)]));
  const [lng, lat] = f.properties!.labelPoint;
  return {
    id: f.properties!.id,
    name: f.properties!.name,
    vertices: rings.reduce((n, r) => n + r.length, 0),
    maxRingVertices: Math.max(...rings.map((r) => r.length)),
    classifierCompatible: check.valid,
    referencePoint: {
      lng,
      lat,
      source: `https://www.openstreetmap.org/node/${f.properties!.labelNode}`,
    },
    structuralReferenceResult: check.classify({ lng, lat }).kind,
    commercialResult: 'PENDING_OWNER_APPROVAL',
  };
});
const references = JSON.parse(
  readFileSync(new URL('references.geojson', root), 'utf8'),
) as FeatureCollection<Point>;
const foreign = data.features.find((f) => f.properties!.id === 'osm-10414515')!;
const referenceCases = [
  ...references.features.map((f) => ({
    name: f.properties!.name,
    point: f.geometry.coordinates,
    source: f.properties!.source,
  })),
  {
    name: 'Zona 10 de Villa Nueva (homónimo excluido)',
    point: foreign.properties!.labelPoint,
    source: foreign.properties!.source,
  },
].map((ref) => ({
  ...ref,
  compatibleGeometryMatches: proposals
    .filter(
      (f) =>
        compileCoverage(catalogue([candidate(f)])).classify({
          lng: ref.point[0],
          lat: ref.point[1],
        }).kind === 'automatic',
    )
    .map((f) => f.properties!.name),
  notEvaluated: areas.filter((a) => !a.classifierCompatible).map((a) => a.id),
  commercialResult: 'ENVIO_POR_CONFIRMAR_NO_APPROVED_COVERAGE',
}));
const boundaryCases = proposals
  .filter(
    (f) => areas.find((a) => a.id === f.properties!.id)!.classifierCompatible,
  )
  .map((f) => {
    const ring =
      f.geometry.type === 'Polygon'
        ? f.geometry.coordinates[0]
        : f.geometry.coordinates[0][0];
    const [lng, lat] = ring[0];
    return {
      name: f.properties!.name,
      point: { lng, lat },
      source: f.properties!.source,
      result: compileCoverage(catalogue([candidate(f)])).classify({ lng, lat }),
    };
  });
const report = {
  purpose:
    'Structural validation of real administrative proposals, not commercial validation',
  productionEnabled: false,
  limits: { catalogueVertices: 4096, ringVertices: 512 },
  totalVertices: areas.reduce((n, a) => n + a.vertices, 0),
  combinedClassifierCompatible: compileCoverage(
    catalogue(proposals.map(candidate)),
  ).valid,
  areas,
  referenceCases,
  boundaryCases,
};
writeFileSync(
  new URL('validation.json', root),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    areas: areas.length,
    totalVertices: report.totalVertices,
    combinedCompatible: report.combinedClassifierCompatible,
    overLimit: areas.filter((a) => !a.classifierCompatible).map((a) => a.name),
  }),
);
