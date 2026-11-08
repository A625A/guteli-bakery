/* global L */
import { checks, canApprove, exportReview, validateLayer } from './model.mjs';
const $ = (id) => document.getElementById(id);
const text = (s) => {
  const e = document.createElement('span');
  e.textContent = s;
  return e;
};
const statuses = {
  proposed: 'Propuesta · por revisar',
  pending: 'Pendiente de delimitación',
  approved: 'Aprobada en esta revisión',
};
const color = { CAES: '#b65a20', CAPITAL: '#28718d' };
const get = async (name) => {
  const r = await fetch('/data/' + name);
  if (!r.ok) throw new Error('No se pudo cargar ' + name);
  return r.json();
};
try {
  const [areasData, refsData, roadsData, contextData, manifest, validation] =
    await Promise.all(
      [
        'areas.geojson',
        'references.geojson',
        'roads.geojson',
        'context.geojson',
        'manifest.json',
        'validation.json',
      ].map(get),
    );
  [areasData, refsData, roadsData, contextData].forEach(validateLayer);
  if (
    manifest.productionEnabled !== false ||
    manifest.pending.some((a) => a.status !== 'pending')
  )
    throw new Error('Estado inicial inseguro');
  const areas = [
    ...areasData.features
      .filter((f) => f.properties.role === 'proposal')
      .map((f) => ({ ...f.properties, geometry: f.geometry })),
    ...manifest.pending,
  ];
  if (areas.some((a) => !['proposed', 'pending'].includes(a.status)))
    throw new Error('No se admite aprobación automática');
  areas.sort(
    (a, b) => a.tariff.localeCompare(b.tariff) || (a.zone ?? 0) - (b.zone ?? 0),
  );
  const reviews = Object.fromEntries(
    areas.map((a) => [
      a.id,
      {
        status: a.status,
        notes: '',
        checks: Object.fromEntries(checks.map((k) => [k, false])),
      },
    ]),
  );
  const annotations = [];
  const layers = {};
  let current = areas[0],
    armed = false;
  const map = L.map('map', { zoomControl: true }).setView([14.54, -90.49], 11);
  L.control.scale({ imperial: false }).addTo(map);
  map.attributionControl.addAttribution(
    '© OpenStreetMap contributors · ODbL | geoBoundaries / CONRED–OCHA FISS · CC BY 3.0 IGO',
  );
  const context = L.geoJSON(contextData, {
    style: {
      color: '#9da99a',
      weight: 1,
      fillColor: '#dce4d7',
      fillOpacity: 0.28,
    },
    onEachFeature: (f, l) =>
      l.bindTooltip(
        text(f.properties.shapeName + ' · municipio de referencia (2021)'),
      ),
  }).addTo(map);
  L.geoJSON(roadsData, {
    style: (f) =>
      f.properties.role === 'review-cut'
        ? { color: '#b65a20', weight: 4, dashArray: '8 6', opacity: 1 }
        : { color: '#68716c', weight: 1.5, opacity: 0.65 },
    onEachFeature: (f, l) =>
      l.bindTooltip(
        text(
          (f.properties.name ?? 'Vía') +
            (f.properties.role === 'review-cut'
              ? ' · división visual propuesta; no límite oficial'
              : ' · referencia OSM; no área de cobertura'),
        ),
      ),
  }).addTo(map);
  const proposalLayer = L.geoJSON(areasData, {
    filter: (f) => f.properties.role === 'proposal',
    style: (f) => ({
      color: color[f.properties.tariff],
      weight: 2,
      fillOpacity: 0.17,
    }),
    onEachFeature: (f, l) => {
      layers[f.properties.id] = l;
      l.on('click', () => select(f.properties.id, false));
      l.bindTooltip(text(f.properties.name));
    },
  }).addTo(map);
  for (const a of areas.filter((a) => a.geometry))
    L.marker([a.labelPoint[1], a.labelPoint[0]], {
      icon: L.divIcon({ className: '', html: '', iconSize: [0, 0] }),
      interactive: false,
    })
      .bindTooltip(text(a.zone ? 'Z' + a.zone : a.name), {
        permanent: true,
        direction: 'center',
        className: 'zone-label',
      })
      .addTo(map);
  const refLayers = {};
  L.geoJSON(refsData, {
    pointToLayer: (f, ll) =>
      L.marker(ll, {
        icon: L.divIcon({ className: 'pending-pin', iconSize: [12, 12] }),
        title: f.properties.name,
      }),
    onEachFeature: (f, l) => {
      refLayers[f.properties.id] = l;
      l.bindTooltip(text(f.properties.name + ' · referencia OSM'));
      l.on('click', () => {
        const a = areas.find((a) => a.referenceId === f.properties.id);
        if (a) select(a.id, false);
        else
          l.bindPopup(
            text(
              f.properties.name +
                ' · ' +
                f.properties.source +
                ' · confirmar en campo; no define cobertura',
            ),
          ).openPopup();
      });
    },
  }).addTo(map);
  const allBounds = proposalLayer.getBounds();
  for (const l of Object.values(refLayers)) allBounds.extend(l.getLatLng());
  map.fitBounds(allBounds, { animate: false, padding: [25, 25] });
  function list() {
    $('areas').replaceChildren();
    const filter = $('filter').value;
    for (const a of areas) {
      if (
        filter !== 'all' &&
        filter !== a.tariff &&
        !(filter === 'pending' && a.status === 'pending')
      )
        continue;
      const b = document.createElement('button');
      b.className = 'area-button';
      b.dataset.tariff = a.tariff;
      b.setAttribute('aria-pressed', String(a.id === current.id));
      const title = document.createElement('strong');
      title.textContent = a.name;
      const caption = document.createElement('small');
      caption.textContent =
        (a.tariff === 'CAES' ? 'Q10' : 'Q35') +
        ' · ' +
        statuses[reviews[a.id].status];
      b.append(title, caption);
      b.onclick = () => select(a.id, true);
      $('areas').append(b);
    }
    $('count').textContent =
      areas.filter((a) => reviews[a.id].status === 'approved').length +
      ' / ' +
      areas.length +
      ' revisadas y aprobadas';
  }
  function approval() {
    $('approve').disabled = !canApprove(
      current,
      reviews[current.id],
      $('reviewer').value,
    );
  }
  function detail() {
    const r = reviews[current.id];
    $('area-name').textContent = current.name;
    $('area-status').textContent = statuses[r.status];
    $('area-description').textContent =
      current.reason ??
      'Límite administrativo real propuesto como referencia. Peter debe decidir si la cobertura coincide con todo este polígono o requiere ajustes.';
    $('metadata').replaceChildren();
    for (const [label, value] of [
      [
        'Tarifa prevista',
        current.tariff === 'CAES' ? 'Q10 · Carretera' : 'Q35',
      ],
      [
        'Fuente',
        current.source ??
          refsData.features.find((f) => f.properties.id === current.referenceId)
            ?.properties.source,
      ],
      [
        'Versión de fuente',
        current.version ? String(current.version) : 'Ver referencia',
      ],
      [
        'Municipio',
        current.municipality ?? 'Fraijanes / corredor CAES: verificar sector',
      ],
    ]) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      if (
        label === 'Fuente' &&
        (value?.startsWith('https://www.openstreetmap.org/') ||
          value?.startsWith('https://www.geoboundaries.org/'))
      ) {
        const a = document.createElement('a');
        a.href = value;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = value;
        dd.append(a);
      } else dd.textContent = value ?? 'Pendiente';
      $('metadata').append(dt, dd);
    }
    const report = validation.areas.find((a) => a.id === current.id);
    $('compatibility').textContent = report
      ? `${report.vertices} vértices originales. ${report.classifierCompatible ? 'Admite comprobación estructural individual.' : 'Excede límites del clasificador o requiere revisión geométrica; no se simplificó.'} El catálogo completo tiene ${validation.totalVertices} vértices (máximo 4096). Ninguna aprobación local lo activa.`
      : 'Sin polígono: no se puede aprobar un límite todavía. Anota el sector exacto y marca referencias públicas para delimitarlo.';
    $('notes').value = r.notes;
    document.querySelectorAll('[data-check]').forEach((el) => {
      el.checked = r.checks[el.dataset.check];
      el.disabled = current.status === 'pending';
    });
    approval();
  }
  function select(id, zoom) {
    current = areas.find((a) => a.id === id);
    list();
    detail();
    for (const [id, l] of Object.entries(layers))
      l.setStyle({
        weight: id === current.id ? 4 : 2,
        fillOpacity: id === current.id ? 0.29 : 0.17,
      });
    if (zoom) {
      if (layers[id])
        map.fitBounds(layers[id].getBounds(), {
          animate: false,
          padding: [35, 35],
        });
      else if (refLayers[current.referenceId])
        map.setView(refLayers[current.referenceId].getLatLng(), 14);
    }
  }
  function invalidate() {
    if (reviews[current.id].status === 'approved')
      reviews[current.id].status = 'proposed';
    list();
    $('area-status').textContent = statuses[reviews[current.id].status];
    approval();
  }
  $('notes').oninput = () => {
    reviews[current.id].notes = $('notes').value;
    invalidate();
  };
  document.querySelectorAll('[data-check]').forEach(
    (el) =>
      (el.onchange = () => {
        reviews[current.id].checks[el.dataset.check] = el.checked;
        invalidate();
      }),
  );
  $('reviewer').oninput = () => {
    for (const r of Object.values(reviews))
      if (r.status === 'approved') r.status = 'proposed';
    list();
    detail();
  };
  $('approve').onclick = () => {
    if (!canApprove(current, reviews[current.id], $('reviewer').value)) return;
    reviews[current.id].status = 'approved';
    list();
    detail();
  };
  $('reopen').onclick = () => {
    reviews[current.id].status = current.status;
    list();
    detail();
  };
  $('filter').onchange = list;
  $('context').onchange = () => {
    if ($('context').checked) context.addTo(map);
    else map.removeLayer(context);
  };
  $('overview').onclick = () =>
    map.fitBounds(allBounds, { animate: false, padding: [25, 25] });
  $('capital').onclick = () => {
    const bounds = L.latLngBounds([]);
    for (const a of areas.filter((a) => a.zone != null))
      bounds.extend(layers[a.id].getBounds());
    map.fitBounds(bounds, { animate: false, padding: [25, 25] });
  };
  $('kilometre').onclick = () =>
    map.fitBounds(
      L.latLngBounds(
        refLayers['node-9146903761'].getLatLng(),
        refLayers['node-9146903759'].getLatLng(),
      ),
      { animate: false, padding: [70, 70], maxZoom: 15 },
    );
  $('add-point').onclick = () => {
    armed = !armed;
    $('add-point').setAttribute('aria-pressed', String(armed));
    $('point-status').textContent = armed
      ? 'Escribe la observación y selecciona un punto en el mapa.'
      : 'Sin direcciones personales ni nombres de clientes.';
  };
  map.on('click', (e) => {
    if (!armed) return;
    const note = $('point-note').value.trim();
    if (!note) {
      $('point-status').textContent =
        'Escribe una observación antes de marcar el punto.';
      return;
    }
    annotations.push({
      areaId: current.id,
      point: { lng: e.latlng.lng, lat: e.latlng.lat },
      note,
    });
    L.marker(e.latlng, {
      icon: L.divIcon({ className: 'adjustment-pin', iconSize: [12, 12] }),
    })
      .bindTooltip(text(note))
      .addTo(map);
    invalidate();
    armed = false;
    $('add-point').setAttribute('aria-pressed', 'false');
    $('point-status').textContent =
      `${annotations.length} observación(es) de punto para exportar.`;
  });
  $('export').disabled = false;
  $('export').onclick = () => {
    const value = exportReview(
      manifest,
      areas,
      reviews,
      $('reviewer').value,
      annotations,
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guteli-revision-zonas.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('save-status').textContent =
      'Archivo exportado. No se modificó ningún catálogo ni servicio.';
  };
  $('snapshot').textContent =
    'Instantánea OSM: ' +
    manifest.osmSnapshot +
    ' · geometrías sin simplificar.';
  select(current.id, false);
} catch {
  $('error').hidden = false;
  $('error').textContent =
    'No se pudo cargar o validar la cartografía. No apruebes zonas: reinicia el visor y revisa los archivos locales.';
  $('export').disabled = true;
  $('approve').disabled = true;
}
