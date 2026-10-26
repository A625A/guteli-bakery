# Cobertura de entrega: preparación local, 26/10/2026

Estado: implementación local desactivada. No es un lanzamiento ni una validación
geográfica real. Rama `main-delivery-coverage-20261025`, creada desde
`origin/main` `8a8bfa011377d9ee20132dc292fd52f69e78cfff`. Sin push ni merge.

## Recuperación y matriz inicial

Se revisaron las especificaciones [de cobertura](../superpowers/specs/2026-09-16-delivery-coverage-design.md)
y [checkout](../superpowers/specs/2026-10-07-commercial-checkout-design.md),
historial, 20 referencias Git locales/remotas y los worktrees disponibles. El
commit `5ee5e67` contenía el diseño; no apareció una implementación del mapa en
código, dependencias o migraciones. Los worktrees antiguos ausentes no pudieron
inspeccionarse como carpetas; no se modificaron otros worktrees.

| Funcionalidad al retomar  | Estado encontrado | Reutilización / resultado local                                    |
| ------------------------- | ----------------- | ------------------------------------------------------------------ |
| Mapa, búsqueda y marcador | Pendiente         | Leaflet local; búsqueda y tiles mediante proxy Geoapify            |
| Polígonos y clasificación | Diseño solamente  | Validador Polygon/MultiPolygon y clasificador; catálogo real vacío |
| Q10/Q35 automáticos       | Pendiente         | Importes fijos del servidor y cotización firmada temporal          |
| Protección de importes    | Existente         | Contrato estricto, cálculo de productos e idempotencia conservados |
| Cotización administrativa | Existente         | `quote-delivery.ts` y `DeliveryQuoteForm.tsx` conservados          |
| Ubicación persistida      | Dirección escrita | Punto confirmado opcional y procedencia privada con migración 0016 |
| Carrito y resumen         | Existente         | Subtotal existente más envío/total antes de solicitar el pedido    |
| Pruebas geográficas       | Pendiente         | Geometrías ficticias exclusivamente bajo `tests/`                  |

No se encontró aprobación de una zona gratuita adicional. Solo recogida es Q0.
La aprobación firmada del 25/10 menciona CAES/Capital y Q10/Q35; no define
polígonos ni autoriza publicación o ventas. El PDF privado no se incorpora a Git.

## Tarifas y geometrías

- `CAES`: Q10 (1000 centavos), intención documentada: carretera a El Salvador
  hasta km35 inclusive, Fraijanes, Sausalito y Pavón.
- `CAPITAL`: Q35 (3500 centavos), intención: zonas 1, 5, 7, 9, 10, 11, 12, 13,
  14, 15, 16 y 17 de Ciudad de Guatemala.
- Recogida: Q0. Todo lo demás o cualquier incertidumbre: envío y total pendientes.

La geometría determina la clasificación; los nombres de dirección no fijan
precios. El catálogo en `src/server/delivery/service.ts` permanece vacío. Ni
activar flags ni agregar claves crea cobertura. No hay polígonos aproximados,
radios, búsqueda por palabras ni distancias en línea recta.

La futura FeatureCollection versionada requiere por área `id`, `label`,
`tariff`, `source`, `license`, `approval` y `boundary`. Solo se admiten Polygon o
MultiPolygon WGS84 en orden `[longitud, latitud]`, anillos cerrados y geometrías
válidas. Fuente/licencia/aprobación son referencias para revisión humana, no
prueba automática de aprobación. Huecos quedan fuera. Un catálogo inválido
falla completo a manual. Los bordes son manuales salvo inclusión explícita
aprobada; esa opción permite representar el km35 inclusivo cuando exista el
polígono correcto. Tarifas distintas que se superponen o incluso comparten
borde se rechazan conservadoramente. Una frontera compartida real requerirá
revisión y tratamiento explícito antes de incorporarla.

Límite inicial: 4096 vértices por catálogo, 512 por anillo; no cruza el
antimeridiano. No sustituye una herramienta GIS de validación de los datos
reales. Antes de admitirlos: verificar puntos reales interiores/exteriores,
municipios homónimos, huecos, bordes y km35 con los dueños. Un punto confirmado
por el cliente no prueba que su dirección escrita coincida: las dudas y
correcciones se resuelven con revisión y cotización manual.

## Flujo y seguridad

El cliente escribe dirección, consiente la búsqueda, elige entre hasta cinco
resultados y confirma o mueve el marcador. Puede continuar sin mapa. Editar la
dirección, cambiar modalidad o mover el punto descarta la tarifa anterior; los
resultados de solicitudes obsoletas se ignoran. Se muestran importes en
centavos con el formateador existente, sin dobles conversiones.

`POST /api/delivery/quote` produce un token HMAC ligado al punto, dirección,
confirmación, área, versión, importe y vencimiento de diez minutos. El payload
no contiene dirección/coordenadas en claro. Al crear el pedido se verifica
firma, vigencia y clasificación vigente, sin consultar al proveedor dentro de
la transacción. El navegador no puede aportar importes. La idempotencia incluye
el punto y token: un reintento idéntico de un pedido guardado sigue funcionando
tras vencer la cotización; editarlo produce conflicto.

La migración agrega columnas anulables y restricciones, sin reescribir pedidos
históricos. Se guardan solo coordenadas confirmadas, identificador/versión y
fuente de precio; no se guarda el token ni historial de búsquedas. El
administrador ve esos datos con los permisos existentes. La cotización manual
cambia la fuente a MANUAL y limpia área/versión; conserva el punto para entrega.
Se mantienen controles de versión, MFA e inmutabilidad de pedidos pagados.

DEMO bloquea búsqueda, cotización y tiles antes de acceder a base/proveedor.
Las claves Geoapify son exclusivamente del servidor; CSP sigue usando el mismo
origen. Origen, formatos, tamaño de cuerpo, URLs fijas y timeouts de cuatro
segundos limitan las solicitudes. Cada IP tiene 120 solicitudes/minuto; el
proveedor comparte un máximo de 4/segundo y 2500/día UTC mediante PostgreSQL.
Cada tile se cuenta como un crédito completo, conservadoramente. El cliente
espacia tiles 300 ms; concurrencia, errores o agotamiento pueden llevar a
cotización manual. No es garantía de capacidad para producción ni sustituye
cuotas de la cuenta, especialmente si otras aplicaciones comparten claves.

No se envían nombre, teléfono ni pedido al proveedor. Se requiere revisar el
aviso y [conservación](privacidad-conservacion.md) antes de habilitarlo; no hay
anonimización automática habilitada. No registrar búsquedas ni URLs de tiles
que revelen áreas en logs/proxy/APM.

## Proveedor, costos y activación pendiente

Verificación documental del 26/10/2026:

- [Leaflet 1.9.4](https://leafletjs.com/download.html), licencia BSD-2-Clause,
  instalado localmente. Sin cuenta ni pago por la biblioteca; conservar avisos.
- [Geoapify Free](https://www.geoapify.com/pricing/): 3000 créditos/día,
  5 solicitudes/segundo, uso comercial permitido con atribución; registro y
  clave requeridos, sin tarjeta para el plan gratuito. Costo previsto US$0
  dentro de límites. Siguiente plan publicado: US$59/mes, antes de impuestos.
- [Consumo](https://www.geoapify.com/pricing-details/): una consulta simple de
  geocodificación consume un crédito, cuatro tiles un crédito. No se equiparan
  créditos con pedidos completos; el uso depende de búsquedas y navegación.
- [Tiles oficiales](https://apidocs.geoapify.com/docs/maps) y
  [geocodificación](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/):
  URLs fijas, búsqueda restringida a Guatemala, sin autocomplete continuo.
- [Privacidad de Geoapify](https://www.geoapify.com/privacy-policy/): procesa
  datos de solicitudes y metadatos de conexión; declara infraestructura UE y
  retención usual de solicitudes exitosas hasta 24 horas. Revisar condiciones
  vigentes y subprocesadores antes de autorizar uso real.
- El [Nominatim público](https://operations.osmfoundation.org/policies/nominatim/)
  no es sustituto libre de restricciones: máximo 1 solicitud/segundo y sin
  autocomplete. No se añadió como fallback silencioso. La alternativa sin
  proveedor ni costo API sigue siendo dirección escrita y cotización manual.

Falta confirmar con los dueños los límites exactos, identidad de Sausalito y
Pavón, trazado del km35, municipios/zonas y correspondencia definitiva de las
dos tarifas; obtener geometrías con licencia compatible y aprobación
identificable. También necesitan aprobar uso del proveedor y aviso de datos.
Registrar cuenta gratuita y generar claves restringidas sería un paso posterior
autorizado; no se creó nada ni se hicieron consultas reales durante este trabajo.

Configuración futura, separada de la autorización comercial:
`DELIVERY_MAPS_ENABLED`, `DELIVERY_PROVIDER_APPROVED`, `GEOAPIFY_SEARCH_KEY`,
`GEOAPIFY_MAPS_KEY`; para clasificación, catálogo revisado,
`DELIVERY_COVERAGE_ENABLED` y secreto propio `DELIVERY_QUOTE_SECRET` de al menos
32 bytes. Todos los flags nuevos están en false en `.env.example`.
No se cambia Oracle, pagos, WhatsApp ni la configuración desplegada.

## Validación y reproducción

Solo datos sintéticos y un clúster PostgreSQL 17 nuevo en loopback 55463. No se
usan las bases ni demo anteriores. Los tests de integración y el harness de
navegador reinician **la base de pruebas indicada**: proporcionar únicamente una
base aislada llamada `guteli_test`.

```sh
npx vitest run tests/unit/delivery-*.test.ts tests/unit/commercial-demo.test.ts tests/unit/order-api.test.ts tests/unit/order-contract.test.ts tests/unit/order.test.ts tests/unit/cart.test.ts
npx vitest run --config vitest.integration.config.ts tests/integration/create-order.test.ts tests/integration/create-order-concurrency.test.ts tests/integration/admin-orders.test.ts tests/integration/checkout-pricing.test.ts
npx playwright test --config playwright.delivery.config.ts
```

El harness usa loopback 3137, comercio habilitado solo para solicitudes ficticias,
proveedor y servicios externos apagados. Las pruebas de mapa interceptan búsqueda,
tiles y cotización con respuestas sintéticas; no demuestran cobertura ni calidad
de geocodificación real. El cálculo firmado real se verifica en integración.
Resultados finales:

- 102 pruebas unitarias dirigidas, 11 archivos: clasificación, firma, contratos,
  proveedor/tiles, importes, carrito y bloqueo DEMO.
- 47 pruebas de integración, 4 archivos, sobre la migración 0016. Después de los
  ajustes de tiempo y procedencia manual se repitieron los 2 archivos afectados:
  40/40 correctas (no se cuentan como pruebas adicionales).
- 3/3 pruebas Chromium: elección y arrastre, Q10/Q35 y totales, invalidación,
  payload sin precios, conservación del carrito, proveedor/tiles fallidos y
  respuesta obsoleta al cambiar dirección. Sin solicitudes externas del navegador.
- `npm ci --no-audit --no-fund`, TypeScript, ESLint sobre los archivos cambiados,
  `git diff --check` y build Next 16.4.2 con Node 24.11.1 correctos.
- Lockfile: solo Leaflet 1.9.4, tipos Leaflet 1.9.21 y tipos GeoJSON agregados;
  ninguna versión previa de dependencia cambió. Sin nueva auditoría npm, suite
  completa ni build Docker/ARM64.

Se conserva el ajuste de encabezado de `AGENTS.md` producido por Next, verificado
contra `node_modules/next/dist/server/lib/generate-agent-files.js`; no cambia las
instrucciones. Las carpetas ajenas `products/` y `artifacts/owner-review/` no se
incluyen. El clúster de pruebas se detiene al finalizar y sus archivos se
conservan; no se borran bases ni evidencia anterior.
