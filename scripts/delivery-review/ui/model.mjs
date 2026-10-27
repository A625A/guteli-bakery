export const checks = ['identity', 'boundary', 'tariff', 'exceptions'];
export function validateLayer(layer) {
  if (
    layer?.type !== 'FeatureCollection' ||
    !Array.isArray(layer.features) ||
    layer.features.length > 1000
  )
    throw new Error('Capa GeoJSON inválida');
  function coords(value) {
    if (!Array.isArray(value) || value.length === 0)
      throw new Error('Coordenadas ausentes');
    if (typeof value[0] === 'number') {
      if (
        value.length !== 2 ||
        !value.every(Number.isFinite) ||
        Math.abs(value[0]) > 180 ||
        Math.abs(value[1]) > 90
      )
        throw new Error('Coordenadas fuera de WGS84');
    } else value.forEach(coords);
  }
  for (const f of layer.features) {
    if (
      f.type !== 'Feature' ||
      !f.properties ||
      !['Polygon', 'MultiPolygon', 'LineString', 'Point'].includes(
        f.geometry?.type,
      )
    )
      throw new Error('Geometría no soportada');
    coords(f.geometry.coordinates);
    const polys =
      f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates]
        : f.geometry.type === 'MultiPolygon'
          ? f.geometry.coordinates
          : [];
    for (const p of polys)
      for (const r of p)
        if (r.length < 4 || JSON.stringify(r[0]) !== JSON.stringify(r.at(-1)))
          throw new Error('Anillo abierto');
  }
  return layer;
}
export function canApprove(area, review, reviewer) {
  return (
    area.status !== 'pending' &&
    Boolean(area.geometry) &&
    reviewer.trim().length >= 2 &&
    checks.every((k) => review.checks[k] === true)
  );
}
export function exportReview(
  manifest,
  areas,
  reviews,
  reviewer,
  annotations,
  now = new Date(),
) {
  return {
    schema: 'guteli-geographic-review-v1',
    catalogueVersion: manifest.version,
    sourceHashes: manifest.sources,
    layerHashes: manifest.layers,
    reviewer: reviewer.trim(),
    exportedAt: now.toISOString(),
    productionEnabled: false,
    notice:
      'Revisión local declarada; no es firma digital, catálogo productivo ni autorización de cobro.',
    areas: areas.map((a) => {
      const r = reviews[a.id];
      return {
        id: a.id,
        name: a.name,
        intendedTariff: a.tariff,
        status:
          r.status === 'approved' && canApprove(a, r, reviewer)
            ? 'approved'
            : a.status === 'pending'
              ? 'pending'
              : 'proposed',
        checks: r.checks,
        notes: r.notes,
        source: a.source ?? null,
        sourceVersion: a.version ?? null,
      };
    }),
    annotations,
  };
}
