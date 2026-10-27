# Revisión geográfica con Peter — 26/10/2026

Preparación local posterior a `84ac080`, en la misma rama
`main-delivery-coverage-20261025`. Reutiliza Leaflet 1.9.4 y el clasificador
existente. El historial del sistema está en [delivery-coverage.md](delivery-coverage.md);
no existía `docs/implementation/2026-10-26-delivery-coverage.md`.

## Abrir la vista

```sh
cd '/Users/andrewarana/Projects/Guteli Bakery'
npm run delivery:review
```

Abrir **http://127.0.0.1:3140/**. Python 3 y `node_modules` del lockfile existente
son suficientes. No requiere PostgreSQL, Next dev, cuenta, claves, GPS ni conexión
a Geoapify. Cerrar con Ctrl+C. Si el puerto está ocupado, usar
`python3 scripts/delivery-review/serve.py --port 3142`.

El servidor solo escucha en 127.0.0.1 y entrega una lista fija de archivos
públicos de revisión; no entrega `.env`, carpetas o rutas arbitrarias. Rechaza
orígenes ajenos y escrituras HTTP. La política CSP bloquea conexiones externas.
Los enlaces de atribución se abren solo cuando la persona los selecciona.
Las observaciones permanecen en memoria del navegador, sin base de datos ni
localStorage. **Exportar antes de cerrar o recargar.**

La vista funciona con cartografía vectorial descargada, sin imágenes satelitales
ni basemap remoto. No reutiliza el componente de checkout que solicita tiles:
reutiliza la misma biblioteca Leaflet y deja intacto ese flujo comercial.

## Qué se muestra

| Capa           | Contenido                                                                                  | Estado inicial                                  |
| -------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Azul, Q35      | Zonas 1, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16 y 17; Fraijanes sur; San José Pinula este 25% | 12 zonas OSM y 2 sectores derivados propuestos  |
| Naranja, Q10   | San José Pinula oeste 75%, Santa Catarina Pinula y Fraijanes norte                         | Propuesta; Peter debe decidir alcance comercial |
| Puntos dorados | Hitos km35/km36, Pavón, referencia vial de Sausalito, cabecera Fraijanes                   | Referencias, no polígonos de cobertura          |
| Gris           | Contexto municipal geoBoundaries y vías OSM                                                | Contexto, sin tarifa implícita                  |
| Sin polígono   | Corredor CAES hasta km35, Sausalito, Pavón                                                 | Pendiente de delimitar                          |

Recogida sigue siendo Q0. No existe otra zona gratuita. La tarifa de las áreas
es la intención documentada, no un precio autorizado por seleccionar el mapa.
Fuentes, versiones, licencias, hashes y transformación están en
[data/delivery-review](../../data/delivery-review/README.md).

Los hitos OSM son pares por calzada, no prueba oficial del kilometraje. Peter
debe contrastarlos con señalización/conocimiento local. Sausalito solo tiene
referencia vial identificada; Pavón un nodo de barrio. No se asume que Pavón sea
el recinto penal. La delimitación administrativa de Fraijanes no sustituye al
corredor CAES ni resuelve por sí sola el alcance de Sausalito y Pavón.

## Checklist visual

1. Seleccionar un área en la lista o en el polígono; revisar fuente y versión.
2. Acercar y recorrer **todo** el borde. Confirmar municipio/sector, accesos,
   condominios o ramales incluidos/excluidos, huecos y fronteras compartidas.
3. Confirmar Q10 o Q35. Para CAES: validar el hito km35 inclusivo, qué cubre el
   corredor y dónde termina; mantener las áreas nombradas por separado según
   la especificación, sin imponer un radio ni corte global por kilometraje.
4. Escribir observaciones. Para señalar una corrección, escribir una nota,
   activar «Marcar ajuste» y seleccionar un punto público. Son referencias de
   ajuste, no nuevos límites ni direcciones de clientes.
5. Completar las cuatro casillas y el nombre de quien revisa. Solo un área con
   geometría permite marcar «Aprobada en esta revisión». Las áreas pendientes
   requieren primero delimitación. Editar notas, casillas, revisor o agregar un
   punto al área aprobada devuelve la propuesta a revisión.
6. Exportar `guteli-revision-zonas.json`. Incluye observaciones, estados, fuente,
   versión, hashes de fuentes/capas y `productionEnabled:false`.

La aprobación en el visor es una declaración local exportada, **no firma digital,
autenticación OWNER/ADMIN ni autorización de ventas**. No se importa al servidor.
Tras revisar, conservar el JSON como evidencia privada y contrastarlo con Peter.
No cargar automáticamente sus observaciones a Git ni reemplazar el catálogo.

## Matriz geográfica y límites

La [matriz de referencias](delivery-geographic-matrix.md) incluye los puntos de
etiqueta de las 12 zonas, cabecera de Fraijanes, km35 y km36, Pavón, Sausalito,
un homónimo en Villa Nueva y los bordes comprobados. El informe reproducible
[validation.json](../../data/delivery-review/validation.json) distingue pruebas
estructurales de aprobación comercial.

Las 17 propuestas actuales suman 5965 vértices, incluyendo las intersecciones del recorte. Tres anillos superan 512 y el catálogo
supera 4096. No se amplió el clasificador ni se simplificó silenciosamente.
Las propuestas aún requieren revisión GIS, tratamiento de fronteras compartidas,
simplificación medida si procede y nueva versión aprobada. La aprobación visual
del original no aprueba automáticamente un derivado simplificado.

## Geoapify Free, preparado pero sin activar

La integración existente permanece intacta y desactivada. Usa
`GEOAPIFY_SEARCH_KEY` y `GEOAPIFY_MAPS_KEY` solo en servidor; jamás `NEXT_PUBLIC_*`.
Búsqueda requiere consentimiento y dos flags explícitos; solo envía el texto
buscado, sin nombre, teléfono ni pedido. Tiles se sirven mediante proxy de
origen propio. Hay timeout, límites de tamaño, manejo genérico de errores y
fallback manual. Atribución Geoapify/OSM ya existe en el componente de checkout.
Este visor offline no utiliza Geoapify y por tanto no consume sus créditos.

Cuando se autorice configurar la cuenta:

1. Registrar la cuenta en [Geoapify](https://myprojects.geoapify.com/) y crear un
   proyecto Güteli con **Free**. Revisar que no se contrate plan pago ni facturación.
   [Condiciones publicadas](https://www.geoapify.com/pricing/): 3000 créditos/día,
   hasta 5 solicitudes/segundo, uso comercial permitido con atribución, sin tarjeta
   para Free. US$0 dentro de límites; no garantiza servicio ilimitado.
2. Crear claves separadas para búsqueda y mapas. Guardarlas en variables privadas
   del servidor o gestor de secretos, nunca Git, exportaciones, chats o capturas.
3. Aplicar restricciones de **IP pública de salida del servidor** según la
   [documentación de claves](https://myprojects.geoapify.com/help/api-keys/).
   Estos proxies no son clientes de navegador: restricciones de referrer/origin
   pueden impedir su funcionamiento. CORS no es control de acceso. Probar las
   restricciones en un entorno autorizado; una IP dinámica necesita planificación.
4. Revisar estadísticas y cuota de proyecto/cuenta. La aplicación limita a
   4 solicitudes/segundo compartidas y 2500/día UTC, contando cada tile como un
   crédito completo aunque el proveedor cobre 0.25. Son límites conservadores;
   no reservan créditos frente a otras apps de la cuenta ni alinean necesariamente
   su ventana diaria con la del proveedor. Un 429 o agotamiento retorna manual.
5. Mantener `DELIVERY_MAPS_ENABLED=false`, `DELIVERY_PROVIDER_APPROVED=false`,
   `DELIVERY_COVERAGE_ENABLED=false` y el bloqueo comercial. El registro o las
   claves no autorizan cambiar esos flags. Acordar privacidad, consentimiento y
   un ensayo posterior controlado con lugares públicos antes de activarlos.

No se crearon cuentas, claves ni recursos facturables. No se enviaron direcciones
personales a servicios externos. Las únicas consultas de red fueron la
investigación y descarga acotada de cartografía pública.

## Validación de este cambio

- **36 pruebas unitarias aprobadas en la entrega inicial** en seis archivos: cartografía, límites del
  clasificador, firma/tarifas, HTTP, permisos de proveedor/tiles y DEMO.
- **2 pruebas de navegador aprobadas en la entrega inicial**: mapa sin red externa, selección, bloqueo de aprobación inicial,
  aprobación ficticia explícita, revocación, puntos, exportación, recarga y errores.
- Servidor de revisión: lista fija, rechazo de `.env`, path traversal, POST y
  origen externo; datos de cliente inexistentes.
- TypeScript (`tsc --noEmit`), ESLint de los archivos nuevos, formato y
  `git diff --check` sin errores.
- Sin migraciones, servicios de producción, cambios en OWNER/ADMIN, pagos,
  WhatsApp, idempotencia, precios ni catálogo aprobado. Sin suites completas,
  auditorías npm ni builds ARM64. No se tocaron Oracle u otros worktrees.

Para repetir: `npx playwright test --config playwright.delivery-review.config.ts`.
Las pruebas del checkout anterior siguen documentadas en su entrega; no se
presentan como recién ejecutadas ni se repiten sin cambios que lo justifiquen.

## Divisiones visuales actuales (v4)

| Municipio             | Q10 naranja         | Q35 azul           | Corte visual                 |
| --------------------- | ------------------- | ------------------ | ---------------------------- |
| Fraijanes             | Norte               | Sur                | Latitud media 14.45415725° N |
| San José Pinula       | 75% oeste del ancho | 25% este del ancho | Longitud -90.28645692324996° |
| Santa Catarina Pinula | Completo            | —                  | Sin recorte                  |

Son instrucciones del usuario para propuestas visuales, no aprobación comercial.
Las proporciones son del rango de coordenadas; no significan mitad o 75% de superficie.
Cada línea punteada se mantiene manual en el clasificador. El JSON exporta las
coordenadas y el método para distinguir estas propuestas de las versiones anteriores.
«Ver ciudad» sigue encuadrando solo las zonas capitalinas; el filtro Q35 incluye
también los nuevos sectores. Las exportaciones v1/v2/v3 son evidencia histórica.

Validación v4: 7 pruebas unitarias de cartografía y 2 de navegador. Se contrastan
los dos lados con el municipio original sobre una cuadrícula, tarifas Q10/Q35,
exclusiones exteriores y tratamiento manual de fronteras; también selección,
colores, exportación y ausencia de aprobación automática.
