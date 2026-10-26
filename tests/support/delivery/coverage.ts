// Synthetic coordinates only. Never import from application code.
export const square = (x: number, y: number, size = 2) => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
];
export const area = (
  id: string,
  tariff: 'CAES' | 'CAPITAL',
  x: number,
  y = 0,
) => ({
  type: 'Feature',
  properties: {
    id,
    tariff,
    label: id,
    source: 'synthetic test',
    license: 'test-only',
    approval: 'test-only',
    boundary: 'manual',
  },
  geometry: { type: 'Polygon', coordinates: [square(x, y)] },
});
export const coverage = () => ({
  type: 'FeatureCollection',
  version: 'test-v1',
  features: [area('q10', 'CAES', 0), area('q35', 'CAPITAL', 4)],
});
