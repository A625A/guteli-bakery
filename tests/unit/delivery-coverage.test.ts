import { describe, expect, it } from 'vitest';
import { compileCoverage } from '@/server/delivery/coverage';
import { area, coverage, square } from '../support/delivery/coverage';

describe('approved geometry classification (synthetic only)', () => {
  it.each([
    [1, 1, 1000],
    [5, 1, 3500],
  ])('prices point %s,%s from server tariff', (lng, lat, shippingMinor) => {
    expect(compileCoverage(coverage()).classify({ lng, lat })).toMatchObject({
      kind: 'automatic',
      shippingMinor,
    });
  });
  it.each([
    { lng: 10, lat: 1 },
    { lng: 0, lat: 1 },
    { lng: NaN, lat: 1 },
    { lng: 181, lat: 1 },
  ])(
    'never grants free shipping for outside/boundary/invalid points',
    (point) => {
      expect(compileCoverage(coverage()).classify(point)).toMatchObject({
        kind: 'manual',
        shippingMinor: null,
      });
    },
  );
  it('handles holes and multipolygons', () => {
    const data = coverage();
    data.features[0].geometry.coordinates.push(square(0.5, 0.5, 1));
    expect(compileCoverage(data).classify({ lng: 1, lat: 1 }).kind).toBe(
      'manual',
    );
    expect(compileCoverage(data).classify({ lng: 0.25, lat: 0.25 }).kind).toBe(
      'automatic',
    );
    const multi = {
      ...coverage(),
      features: [
        {
          ...area('islands', 'CAES', 0),
          geometry: {
            type: 'MultiPolygon',
            coordinates: [[square(0, 0)], [square(4, 0)]],
          },
        },
      ],
    };
    expect(compileCoverage(multi).classify({ lng: 5, lat: 1 })).toMatchObject({
      shippingMinor: 1000,
    });
  });
  it('includes an explicitly approved boundary, never an assumed km radius', () => {
    const data = coverage();
    data.features[0].properties.boundary = 'include';
    expect(compileCoverage(data).classify({ lng: 2, lat: 1 })).toMatchObject({
      shippingMinor: 1000,
    });
    expect(compileCoverage(data).classify({ lng: 2.001, lat: 1 }).kind).toBe(
      'manual',
    );
  });
  it.each([
    'overlap',
    'bowtie',
    'open',
    'holeOutside',
    'noApproval',
    'unknownTariff',
  ])('rejects invalid coverage %s as a whole', (kind) => {
    const data = coverage();
    if (kind === 'overlap') data.features.push(area('conflict', 'CAPITAL', 1));
    if (kind === 'bowtie')
      data.features[0].geometry.coordinates = [
        [
          [0, 0],
          [2, 2],
          [0, 2],
          [2, 0],
          [0, 0],
        ],
      ];
    if (kind === 'open') data.features[0].geometry.coordinates[0].pop();
    if (kind === 'holeOutside')
      data.features[0].geometry.coordinates.push(square(10, 10));
    if (kind === 'noApproval') data.features[0].properties.approval = '';
    if (kind === 'unknownTariff')
      Object.assign(data.features[0].properties, {
        tariff: 'FREE',
        shippingMinor: 0,
      });
    expect(compileCoverage(data).valid).toBe(false);
    expect(compileCoverage(data).classify({ lng: 5, lat: 1 }).kind).toBe(
      'manual',
    );
  });
  it('empty production catalogue cannot classify a location', () => {
    expect(
      compileCoverage({
        type: 'FeatureCollection',
        version: 'pending',
        features: [],
      }).classify({ lng: 1, lat: 1 }).kind,
    ).toBe('manual');
  });
});
