"""Rebuild review-only WGS84 layers from versioned local public snapshots. No network."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/delivery-review'
SOURCES = DATA / 'sources'
ZONES = {9283360: 1, 13730388: 5, 9286045: 7, 13680910: 9, 13733477: 10,
         13519873: 11, 13523302: 12, 13680538: 13, 13733478: 14, 13733479: 15,
         13733411: 16, 9266318: 17}

def save(name, value):
    (DATA / name).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')

def feature(geometry, properties):
    return {'type': 'Feature', 'geometry': geometry, 'properties': properties}

def collection(features):
    return {'type': 'FeatureCollection', 'features': features}

def osm(e):
    return {'source': f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
            'license': 'ODbL-1.0', 'version': e['version'], 'sourceTimestamp': e['timestamp']}

def relation_geometry(e):
    # These selected relations use outer ways only. Fail, never invent a closure.
    members = [m for m in e['members'] if m['type'] == 'way']
    if any(m['role'] != 'outer' for m in members):
        raise ValueError(f"Unsupported role in {e['id']}; manual GIS review required")
    segments = [[[p['lon'], p['lat']] for p in m['geometry']] for m in members]
    rings = []
    while segments:
        ring = segments.pop(0)
        while ring[0] != ring[-1]:
            for i, segment in enumerate(segments):
                if segment[0] == ring[-1] or segment[-1] == ring[-1]:
                    if segment[-1] == ring[-1]: segment = segment[::-1]
                    ring.extend(segment[1:]); segments.pop(i); break
            else:
                raise ValueError(f"Open/disconnected ring in relation {e['id']}")
        signed = sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]))
        if signed < 0: ring.reverse()  # RFC7946 orientation; no vertex displacement.
        rings.append(ring)
    return {'type': 'Polygon', 'coordinates': [rings[0]]} if len(rings)==1 else {'type':'MultiPolygon','coordinates':[[r] for r in rings]}

def clip_ring(geometry, axis, cut, greater=True):
    """Clip a simple ring at one coordinate; reject disconnected/complex cuts."""
    if geometry['type'] != 'Polygon' or len(geometry['coordinates']) != 1:
        raise ValueError('Cut requires one ring; GIS review needed')
    ring = geometry['coordinates'][0]
    crossings = []
    output = []
    for a, b in zip(ring, ring[1:]):
        a_inside = a[axis] >= cut if greater else a[axis] <= cut
        b_inside = b[axis] >= cut if greater else b[axis] <= cut
        if a_inside != b_inside:
            other = 1-axis
            point = [0,0]
            point[axis] = cut
            point[other] = a[other] + (b[other]-a[other]) * (cut-a[axis]) / (b[axis]-a[axis])
            output.append(point)
            crossings.append(point)
        if b_inside: output.append(b)
    # More intersections may create disconnected parts: never bridge them.
    if len(crossings) != 2 or len(output) < 3:
        raise ValueError('Ambiguous cut; GIS review needed')
    if output[0] != output[-1]: output.append(output[0])
    return {'type':'Polygon','coordinates':[output]}, crossings

def interior_label(ring):
    """Display-only anchor in the widest interior interval at middle latitude."""
    latitude = (min(p[1] for p in ring)+max(p[1] for p in ring))/2
    xs = sorted(a[0]+(b[0]-a[0])*(latitude-a[1])/(b[1]-a[1])
                for a,b in zip(ring,ring[1:]) if (a[1]>latitude)!=(b[1]>latitude))
    if not xs or len(xs)%2: raise ValueError('Cannot place interior display label')
    left,right = max(zip(xs[::2],xs[1::2]),key=lambda pair:pair[1]-pair[0])
    return [(left+right)/2,latitude]

def main():
    original = json.loads((SOURCES / 'osm-selected.json').read_text())
    elements = original['elements']
    by_id = {e['id']:e for e in elements}
    areas, references, roads = [], [], []
    for e in elements:
        if e['type'] == 'relation':
            n = ZONES.get(e['id'])
            tariff = 'CAPITAL' if n else None
            role = 'proposal' if tariff else 'context'
            name = f'Zona {n} · Ciudad de Guatemala' if n else e['tags']['name']
            label = next(m for m in e['members'] if m['role'] in ('label','admin_centre'))
            areas.append(feature(relation_geometry(e), {**osm(e),'id':f"osm-{e['id']}",'name':name,'zone':n,'municipality':'Guatemala' if n else e['tags']['name'],'tariff':tariff,'role':role,'status':'proposed' if tariff else 'reference','labelPoint':[label['lon'],label['lat']],'labelNode':label['ref']}))
        elif e['type']=='node':
            references.append(feature({'type':'Point','coordinates':[e['lon'],e['lat']]},{**osm(e),'id':f"node-{e['id']}",'name':e['tags']['name'],'distance':e['tags'].get('distance'),'role':'reference'}))
        elif e['type']=='way':
            roads.append(feature({'type':'LineString','coordinates':[[p['lon'],p['lat']] for p in e['geometry']]},{**osm(e),'name':e['tags'].get('name','Vía de referencia'),'ref':e['tags'].get('ref'),'role':'reference'}))
    fraijanes = next(f for f in areas if f['properties']['id'] == 'osm-9624941')
    original_ring = fraijanes['geometry']['coordinates'][0]
    cut = (min(p[1] for p in original_ring) + max(p[1] for p in original_ring)) / 2
    north, crossings = clip_ring(fraijanes['geometry'], 1, cut)
    ring = north['coordinates'][0]
    label = [(min(p[i] for p in ring)+max(p[i] for p in ring))/2 for i in (0,1)]
    derivation = {'method':'clip-north-at-mid-latitude','latitude':cut,
                  'baseId':'osm-9624941','status':'visual-proposal-only'}
    areas.append(feature(north, {**osm(by_id[9624941]),
        'id':'fraijanes-north','name':'Fraijanes · mitad norte','municipality':'Fraijanes',
        'tariff':'CAES','role':'proposal','status':'proposed','labelPoint':label,
        'labelKind':'computed-bounds-center','derivation':derivation,
        'reason':f'Q10 · Carretera. Recorte visual solicitado por latitud media ({cut:.8f}° N). No representa mitad de superficie ni un límite administrativo oficial. Pendiente revisión de Peter.'}))
    south, _ = clip_ring(fraijanes['geometry'], 1, cut, greater=False)
    ring = south['coordinates'][0]
    label = [(min(p[i] for p in ring)+max(p[i] for p in ring))/2 for i in (0,1)]
    areas.append(feature(south, {**osm(by_id[9624941]),
        'id':'fraijanes-south','name':'Fraijanes · mitad sur','municipality':'Fraijanes',
        'tariff':'CAPITAL','role':'proposal','status':'proposed','labelPoint':label,
        'labelKind':'computed-bounds-center',
        'derivation':{**derivation,'method':'clip-south-at-mid-latitude'},
        'reason':f'Q35 solicitado para el sector sur. Corte visual por latitud media ({cut:.8f}° N), compartido con el norte Q10. No representa mitad de superficie ni un límite oficial. Pendiente revisión de Peter.'}))
    roads.append(feature({'type':'LineString','coordinates':crossings}, {
        **osm(by_id[9624941]),'id':'fraijanes-north-cut','role':'review-cut',
        'name':f'Corte propuesto de Fraijanes · {cut:.8f}° N · latitud media',
        'derivation':derivation}))
    context = json.loads((SOURCES / 'municipal-context.geojson').read_text())
    for f in context['features']:
        name = f['properties']['shapeName']
        if name not in ('San José Pinula', 'Santa Catarina Pinula'): continue
        ring = f['geometry']['coordinates'][0]
        # Display anchor only; not a settlement or customer address.
        label = [(min(p[i] for p in ring)+max(p[i] for p in ring))/2 for i in (0,1)]
        properties = {
            'id': 'gb-'+f['properties']['shapeID'], 'name':name, 'municipality':name,
            'source':'https://www.geoboundaries.org/api/current/gbOpen/GTM/ADM2/',
            'license':'CC-BY-3.0-IGO', 'version':'9469f09 / GTM-ADM2-79465075',
            'sourceTimestamp':'2021', 'tariff':'CAES', 'role':'proposal', 'status':'proposed',
            'labelPoint':label, 'labelKind':'computed-bounds-center',
            'reason':'Propuesta Q10 · Carretera, solicitada por el usuario. Límite municipal geoBoundaries (2021), sin modificar; revisar alcance comercial y posibles diferencias con OSM.'}
        if name == 'San José Pinula':
            longitude = min(p[0] for p in ring) + .75*(max(p[0] for p in ring)-min(p[0] for p in ring))
            for side, greater, tariff, portion in [('west',False,'CAES',75),('east',True,'CAPITAL',25)]:
                geometry, intersections = clip_ring(f['geometry'],0,longitude,greater)
                clipped_ring = geometry['coordinates'][0]
                side_name = 'oeste' if side == 'west' else 'este'
                split = {'method':'clip-at-longitude-width-ratio','longitude':longitude,
                         'westWidthRatio':.75,'side':side,'baseId':properties['id'],
                         'status':'visual-proposal-only'}
                areas.append(feature(geometry,{**properties,'id':properties['id']+'-'+side,
                    'name':f'San José Pinula · {portion}% {side_name}', 'tariff':tariff,
                    'labelPoint':interior_label(clipped_ring),'labelKind':'computed-interior-scanline',
                    'derivation':split,
                    'reason':f'Propuesta Q{10 if tariff=="CAES" else 35} para el {portion}% {side_name} del ancho este–oeste, por instrucción del usuario. Corte en longitud {longitude:.8f}°. No es porcentaje de superficie ni límite oficial. Pendiente revisión de Peter.'}))
            roads.append(feature({'type':'LineString','coordinates':intersections},{
                'source':properties['source'],'license':properties['license'],'version':properties['version'],
                'id':'san-jose-pinula-cut','role':'review-cut','derivation':{**split,'side':'both'},
                'name':f'Corte propuesto de San José Pinula · 75% oeste Q10 / 25% este Q35 · {longitude:.8f}°'}))
        else:
            areas.append(feature(f['geometry'],properties))
    access = by_id[383796078]
    references.append(feature({'type':'Point','coordinates':[access['geometry'][0]['lon'],access['geometry'][0]['lat']]},{**osm(access),'id':'sausalito-access','name':'Vía hacia El Sausalito · punto de referencia, no límite','role':'reference'}))
    road_source = json.loads((SOURCES / 'osm-roads.json').read_text())
    for e in road_source['elements']:
        if e['tags'].get('ref')=='CA-1 Or':
            roads.append(feature({'type':'LineString','coordinates':[[p['lon'],p['lat']] for p in e['geometry']]},{**osm(e),'name':e['tags'].get('name','CA-1 Oriente'),'ref':'CA-1 Or','role':'reference'}))
    save('areas.geojson',collection(areas));save('references.geojson',collection(references));save('roads.geojson',collection(roads))
    pending = [
      {'id':'caes-corridor','name':'CAES hasta km35 inclusive','tariff':'CAES','status':'pending','referenceId':'node-9146903761','reason':'Falta delimitar ancho, accesos y exclusiones del corredor. Hitos OSM requieren verificación de Peter.'},
      {'id':'sausalito','name':'Sausalito','tariff':'CAES','status':'pending','referenceId':'sausalito-access','reason':'Solo referencia vial; confirmar lugar exacto y trazar su límite comercial.'},
      {'id':'pavon','name':'Pavón','tariff':'CAES','status':'pending','referenceId':'node-12019686246','reason':'Nodo de barrio OSM; falta límite del sector. No se asume que sea el recinto penal.'},
    ]
    save('manifest.json',{'version':'review-2026-10-26-v4','purpose':'local-review-only','productionEnabled':False,'osmSnapshot':original['osm3s']['timestamp_osm_base'],'pending':pending,'layers':{name:hashlib.sha256((DATA/name).read_bytes()).hexdigest() for name in ['areas.geojson','references.geojson','roads.geojson','sources/municipal-context.geojson']},'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(SOURCES.iterdir()) if p.is_file()},'transformation':'Keep Santa Catarina Pinula unchanged at Q10; split San Jose Pinula at 75 percent of west-to-east longitude span into west Q10 and east Q35; split original OSM Fraijanes at mid-latitude into north Q10 and south Q35 as user-requested visual proposals, interpolating only two edge intersections; retain original as context. Join OSM outer ways by identical endpoints; orient rings counterclockwise; no simplification, rounding or buffers. Road segments are an incomplete reference, not a corridor or kilometre cut.'})

if __name__ == '__main__': main()
