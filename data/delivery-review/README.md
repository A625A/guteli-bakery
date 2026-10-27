# Cartografía para revisión local — no es cobertura comercial

Todos los polígonos empiezan como **propuesta**. Fraijanes norte, CAES, Sausalito y Pavón quedan
pendientes de delimitación. No importar estos archivos al catálogo de producción.

## Fuentes y licencias

- Los objetos de origen OSM en `areas.geojson`, `references.geojson`, `roads.geojson` y las instantáneas
  `sources/osm-*.json`: © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
  [Atribución y condiciones](https://www.openstreetmap.org/copyright).
  Cada objeto incluye URL, versión y fecha de edición. La base derivada OSM se
  distribuye bajo ODbL para los objetos de origen OSM; conservar atribución y obligaciones de compartir la base
  derivada cuando corresponda. No aplicar esta licencia automáticamente al código
  de la aplicación ni a la capa separada de geoBoundaries.
- `sources/municipal-context.geojson`: selección sin desplazamiento de siete
  municipios de [geoBoundaries GTM ADM2](https://www.geoboundaries.org/api/current/gbOpen/GTM/ADM2/),
  fuente original CONRED / OCHA FISS, año representado 2021, versión estática
  `9469f09`, boundaryID `GTM-ADM2-79465075`. Licencia original declarada
  [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/); atribuir a
  CONRED/OCHA FISS y geoBoundaries e indicar la selección. Los polígonos de San José Pinula y Santa Catarina Pinula también se copian
  sin modificar a `areas.geojson` como propuestas Q10, bajo esta misma licencia.
  Los otros cinco municipios son contexto; ningún polígono certifica cobertura comercial.
- Leaflet 1.9.4 ya instalado: BSD-2-Clause; se sirve desde `node_modules` y se
  conservan sus avisos. No se añade CDN ni dependencia.

Las fechas OSM son UTC (la instantánea del 27/10 UTC corresponde al 26/10 por la
noche en Guatemala). Se conservaron geometrías, IDs, versiones y fechas; se
excluyeron nombres/IDs de editores y etiquetas ajenas a la revisión. Los hashes
de respuestas originales están en `sources/retrieval.json`; los hashes de los
archivos conservados y capas resultantes están en `manifest.json`.

Se identificó la capa municipal `División administrativa por zonas`, distribuida
por N4Cities en ArcGIS (item `0b5c8c8aaf9b4854b9b8a2ac9dcbf2c3`, capa 11).
`licenseInfo` y `accessInformation` eran null. No se descargó ni redistribuyó su
geometría. Se descartó GADM como ruta de uso comercial sin permiso. No se
asume que la publicación de un servicio de mapas conceda derechos comerciales.

## Transformación y precisión

`prepare.py` une vías exteriores por extremos exactamente iguales, comprueba
cierres y orienta anillos según RFC7946. Rechaza roles no soportados y anillos
abiertos. No redondea, simplifica, crea buffers, interpola, recorta carreteras por
kilometraje ni inventa límites. Los nodos de etiqueta OSM posicionan nombres;
no son centroides calculados ni direcciones de clientes. La referencia de
Sausalito es el primer vértice real de una vía identificada, no un centro de
población asumido. Las carreteras son una selección incompleta de CA-1 Oriente y
vías de Sausalito; no constituyen corredor de entrega ni ruta calculada.

Los 14 polígonos propuestos suman 5536 vértices, excediendo 4096. Anillos que
exceden 512: zona 7 (789), zona 16 (685), zona 17 (723). Los otros once pasan
individualmente el clasificador actual. No se afirma validación topológica
completa de los tres rechazados ni admisión conjunta. El visor comprueba tipo,
coordenadas WGS84 y cierre; la evaluación productiva sigue bloqueada.

No se aplicó simplificación. Para una futura versión, evaluar simplificación
con preservación de topología y fronteras compartidas en un CRS métrico local,
medir distancia de Hausdorff y área cambiada, comprobar huecos/solapes y volver a
revisar con Peter. Un objetivo inicial a evaluar sería desviación máxima de 2 m,
no una precisión prometida: si no permite cumplir 512/4096, no aumentar tolerancia
silenciosamente. La precisión posicional de origen no está certificada por sus
coordenadas decimales. Mantener los originales y producir una versión distinta
con informe de errores antes de incorporar geometría simplificada.

## Reproducción sin red

Desde la raíz del repositorio, con las dependencias ya instaladas:

```sh
python3 scripts/delivery-review/prepare.py
node --import tsx scripts/delivery-review/validate.ts
npm run delivery:review
```

Los dos primeros comandos regeneran derivados de las instantáneas locales, sin
consultar servicios. No actualizan fuentes ni aprueban áreas. El visor muestra
los datos en `http://127.0.0.1:3140/`. Consulta la [guía para revisar con Peter](../../docs/operations/delivery-geographic-review.md).

## Cambio solicitado: Carretera Q10

San José Pinula y Santa Catarina Pinula son propuestas Q10, con geometría
municipal geoBoundaries 2021 intacta. Sus etiquetas usan el centro de la caja
envolvente, calculado solo para mostrar el nombre; no son localidades observadas.
Fraijanes completo se conserva como contexto sin tarifa. La mitad norte queda
pendiente de acordar el corte, sin asumir que significa mitad del área ni una carretera concreta.
