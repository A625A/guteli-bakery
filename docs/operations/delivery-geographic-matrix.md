# Matriz de revisión geográfica — 26/10/2026

**Ninguna fila valida cobertura comercial.** Los puntos son referencias públicas
OSM; no son domicilios de clientes. Se preservan coordenadas originales WGS84.
Las pruebas estructurales usan el clasificador existente con datos de revisión
exclusivamente, sin cargar un catálogo productivo.

## Referencias dentro de polígonos administrativos propuestos

| Área                          | Latitud, longitud       | Fuente del punto                                     | Resultado estructural individual           | Resultado comercial |
| ----------------------------- | ----------------------- | ---------------------------------------------------- | ------------------------------------------ | ------------------- |
| Zona 1 · Ciudad de Guatemala  | 14.6368919, -90.510237  | [OSM](https://www.openstreetmap.org/node/6478263720) | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 10 · Ciudad de Guatemala | 14.602933, -90.5107544  | [OSM](https://www.openstreetmap.org/node/5627038115) | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 11 · Ciudad de Guatemala | 14.6100568, -90.5511114 | [OSM](https://www.openstreetmap.org/node/6478263722) | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 12 · Ciudad de Guatemala | 14.5779451, -90.5504301 | [OSM](https://www.openstreetmap.org/node/1806862355) | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 13 · Ciudad de Guatemala | 14.5713278, -90.5296127 | [OSM](https://www.openstreetmap.org/node/6478263726) | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 14 · Ciudad de Guatemala | 14.5835631, -90.5137158 | [OSM](https://www.openstreetmap.org/node/6478263727) | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 15 · Ciudad de Guatemala | 14.5916081, -90.4922264 | [OSM](https://www.openstreetmap.org/node/1073129091) | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 16 · Ciudad de Guatemala | 14.6105332, -90.4720005 | [OSM](https://www.openstreetmap.org/node/472113925)  | No evaluado: excede límite de anillo       | Pendiente de Peter  |
| Zona 17 · Ciudad de Guatemala | 14.6453355, -90.4653976 | [OSM](https://www.openstreetmap.org/node/1073096954) | No evaluado: excede límite de anillo       | Pendiente de Peter  |
| Zona 5 · Ciudad de Guatemala  | 14.6255201, -90.4992645 | [OSM](https://www.openstreetmap.org/node/472113935)  | Interior del polígono; admite clasificador | Pendiente de Peter  |
| Zona 7 · Ciudad de Guatemala  | 14.6287744, -90.5482471 | [OSM](https://www.openstreetmap.org/node/2691207052) | No evaluado: excede límite de anillo       | Pendiente de Peter  |
| Zona 9 · Ciudad de Guatemala  | 14.6071168, -90.5208672 | [OSM](https://www.openstreetmap.org/node/6478263725) | Interior del polígono; admite clasificador | Pendiente de Peter  |

## Corredor, sectores y homónimos

La coincidencia siguiente solo se comprobó contra los doce polígonos que admite
el clasificador. Zonas 7/16/17 no se evaluaron por su tamaño; no se presenta una
comprobación exhaustiva de toda la geometría real.

| Referencia                                              | Latitud, longitud       | Fuente                                                 | Coincidencia en polígonos evaluables | Decisión comercial pendiente                                                        |
| ------------------------------------------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------- |
| Fraijanes                                               | 14.4621012, -90.4388234 | [OSM](https://www.openstreetmap.org/node/2505212605)   | Fraijanes norte                      | Definir límite comercial; referencia no autoriza cobertura                          |
| KM. 36                                                  | 14.3910611, -90.4685986 | [OSM](https://www.openstreetmap.org/node/9146903759)   | Ninguna                              | Posterior al corte del corredor; confirmar exclusiones y otras áreas independientes |
| KM. 36                                                  | 14.3910767, -90.4685018 | [OSM](https://www.openstreetmap.org/node/9146903760)   | Ninguna                              | Posterior al corte del corredor; confirmar exclusiones y otras áreas independientes |
| KM. 35                                                  | 14.3996638, -90.4694955 | [OSM](https://www.openstreetmap.org/node/9146903761)   | Ninguna                              | Validar hito y delimitar corredor; km35 inclusive                                   |
| KM. 35                                                  | 14.3996233, -90.4695979 | [OSM](https://www.openstreetmap.org/node/9146903762)   | Ninguna                              | Validar hito y delimitar corredor; km35 inclusive                                   |
| Pavón                                                   | 14.5186999, -90.4411697 | [OSM](https://www.openstreetmap.org/node/12019686246)  | Fraijanes norte                      | Definir límite comercial; referencia no autoriza cobertura                          |
| Vía hacia El Sausalito · punto de referencia, no límite | 14.5215434, -90.4576895 | [OSM](https://www.openstreetmap.org/way/383796078)     | Fraijanes norte                      | Definir límite comercial; referencia no autoriza cobertura                          |
| Zona 10 de Villa Nueva (homónimo excluido)              | 14.501518, -90.6148157  | [OSM](https://www.openstreetmap.org/relation/10414515) | Ninguna                              | No confundir con zona 10 de Ciudad de Guatemala                                     |

## Bordes, ambigüedad y pruebas sintéticas

| Caso                              | Evidencia / método                                                                                   | Resultado y límite                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Bordes reales                     | Primer vértice de cada uno de los doce polígonos compatibles, coordenadas y URL en `validation.json` | Los doce retornan manual/boundary; no se supone inclusión               |
| Zonas 7, 16, 17                   | 789, 685 y 723 vértices por anillo                                                                   | Rechazadas por límite 512; revisión GIS pendiente                       |
| Catálogo real conjunto            | 5704 vértices                                                                                        | Rechazado por máximo 4096; no cobertura validada                        |
| Fronteras compartidas reales      | Revisar con Peter/GIS todos los contactos y diferencias entre fuentes                                | No se certifican continuidad, ausencia de huecos o solapes del conjunto |
| Q10/Q35 y recogida Q0             | Geometrías sintéticas de `tests/support/delivery/coverage.ts`                                        | Pruebas de importes del servidor; no evidencia de geografía real        |
| Solapes y límites ambiguos        | Polígonos sintéticos con tarifas distintas y casos de borde                                          | Manual/rechazo; no se trasladan al mapa real                            |
| Hito inclusivo                    | Prueba sintética `boundary: include`; no radio ni distancia recta                                    | La inclusión de km35 real exige geometría y aprobación pendientes       |
| Nombres iguales en otro municipio | Punto público de Zona 10 de Villa Nueva + prueba sintética de nombres                                | El nombre no selecciona tarifa; continúa envío por confirmar            |
| Fuera de cobertura                | Puntos sintéticos exteriores y referencias públicas km36/Villa Nueva                                 | No se inventa tarifa ni se presume envío gratis                         |

No se midieron tolerancias de simplificación: no se simplificó. Las propuestas
siguen sin aprobación y el catálogo productivo sigue vacío. Ver las
[fuentes y precisión](../../data/delivery-review/README.md) y la
[guía de revisión](delivery-geographic-review.md).

## Pinula y Fraijanes norte (revisión v3)

Los polígonos municipales originales de San José Pinula (185 vértices) y Santa
Catarina Pinula (114) se añaden como Q10. Ambos pasan individualmente el clasificador.
Sus puntos de etiqueta son centros calculados de caja envolvente, no ubicaciones
observadas: respectivamente (lat, lon) 14.549374245000052, -90.33614285549996 y
14.567031847500061, -90.46573343449995. Ambos resultan interiores; sus primeros
vértices devuelven manual/boundary. Fuente geoBoundaries 9469f09, CC BY 3.0 IGO.

Fraijanes completo queda como contexto. Su parte norte se deriva con el corte
solicitado por latitud media **14.45415725° N** (168 vértices). Cabecera de Fraijanes,
Pavón y referencia vial de Sausalito coinciden estructuralmente con el derivado;
esto no resuelve los límites propios de los sectores ni aprueba cobertura comercial.

Una cuadrícula de puntos contrasta el polígono derivado con el original: conserva
su interior al norte y excluye el sur. El punto medio del segmento de corte
retorna manual/boundary. Los vértices conservados provienen del original y solo
se añaden dos intersecciones sobre sus aristas. No se confunde este corte visual
con un límite oficial o con mitad de superficie.
