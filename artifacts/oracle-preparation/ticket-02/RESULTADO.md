# Ticket 02 — cerrado localmente

21/10/2026, America/Guatemala. **VALIDADO EN DOCKER/LINUX ARM64 LOCAL; NO VALIDADO EN ORACLE.**

## Candidato y alcance

- Aplicación construida desde `9477d74c8081d3163b1f789e1bf8b5e1c13e67ee`; imagen `sha256:96bf0bbfbe2e6059b19cde29e2445741aa938b071ec937f208ea64e00dab92ff`. Las correcciones posteriores sólo afectan proxy/configuración, pruebas y documentación; no requieren repetir Next build.
- Configuración corregida y evidencia publicadas en `667b927e884c29aaad15a906219d88da9084246c`. Digests multiarch y manifiestos ARM64: [images.lock.json](../../../infra/oracle/images.lock.json).
- Host macOS ARM64; VM Colima VZ Linux/aarch64, Docker Engine 29.5.2, Compose Linux 5.1.4 (ejecutable macOS 5.5.0). Node 22.23.4, PostgreSQL 17.11, Caddy 2.11.7. **Ejecución ARM64 sobre virtualización de Apple Silicon; no emulación de otra ISA, bare metal ni Oracle.**
- Se inició el perfil Colima existente con `--activate=false --save-config=false --ssh-config=false`. Su arranque registró automáticamente el contexto `colima` y provisionó binfmt dentro de la VM; el contexto activo permaneció `default`. No se instalaron paquetes del sistema anfitrión ni se editaron opciones globales de Docker.

## Evidencia dirigida

Resultados agregados: [evidence.json](evidence.json). No se suman como una única suite las comprobaciones que se solapan.

| Comprobación | Resultado observado |
|---|---|
| Docker y Compose | Daemon Linux/aarch64 operativo; configuración de producción resuelta y validada |
| Build `--platform linux/arm64` | `npm ci`, Next 16.3.3 y TypeScript aprobados; runtime ensamblado reutilizando caché; no build amd64 ni QEMU |
| Dependencias nativas | SWC utilizado por build real; `sharp` transformó una imagen y produjo 90 bytes PNG en runtime Linux/arm64 |
| Next.js/PostgreSQL | Instalación nueva mediante funciones reales de `ops.py`; health, esquema exacto y `/readyz` aprobados |
| Proxy | Caddyfile exacto validado sin red como UID1001; HTTPS local HTTP/2 200, HSTS/noindex; HTTP 308 a `https://guteli.invalid/` (443 externo) |
| Headers del proxy | Adaptador real de Caddy confirma sobrescritura de Host/X-Forwarded-Host/Proto/For y eliminación de Forwarded/X-Real-IP; sin servidor HTTP de eco adicional |
| Aislamiento | App/DB sin puertos publicados; backend interno sólo con app/DB; UID1001/999, rootfs read-only; proxy sólo loopback 18080/18443 |
| Persistencia | Reinicio de app y PostgreSQL; hash de catálogo y bytes de uploads iguales; readiness recuperado |
| Almacenamiento | Montaje ausente, UUID incorrecto, PG_VERSION ausente y bind inexistente rechazados; no creación silenciosa; pérdida de marcador da 503 genérico |
| Demo | Cuatro POST de pedidos/checkout devuelven 403 COMMERCIAL_DEMO antes de parsear; flags comerciales/pagos/WhatsApp forzados a false; cinco pedidos ficticios UNPAID |
| WhatsApp | Proveedor deshabilitado y automatización null incluso con flags de envío contradictorios; cero llamadas de red; evento PENDING con attempts=0 |
| Protección de operación | Install sobre app existente y update con esquema incorrecto rechazados |
| Update y backup | Reaplicación del mismo candidato con respaldo cifrado/autenticado: 9.0 s; no cambio de versión ni migración implícita |
| Fallo de backup | Retención llena provocada con archivos ficticios: update rechazado y app anterior nuevamente healthy; fixtures de fallo retirados |
| App detenida | Weekly-backup devuelve APP_DETENIDA y conserva la app detenida |
| Restore Docker | 0.73 s; seis hashes de tablas y bytes de imágenes iguales, incluido trabajo pendiente; rechazo de DB existente y archivo alterado |
| Recuperación de aplicación | Instancia separada sin puertos públicos usa DB y uploads restaurados: `/readyz` 200; evento pendiente sin procesar |
| Regresión dirigida | Caddy Docker RED→GREEN; contratos Compose 3/3; ESLint y compilación Python de archivos nuevos aprobados |

## Fallos y correcciones

1. **Caddy real:** `exec /usr/bin/caddy: operation not permitted`. El binario oficial tiene `cap_net_bind_service=ep`; `cap_drop: ALL` lo excluía del bounding set. Se añadió sólo `NET_BIND_SERVICE` al proxy, manteniendo UID1001, read-only y no-new-privileges. La regresión usa las restricciones reales del Compose y no necesita red.
2. **HTTP/3:** se observó `Alt-Svc :8443`, aunque sólo se publicaba TCP. Caddy ahora usa h1/h2; configuración adaptada y respuesta TLS confirman que desapareció el anuncio incorrecto.
3. **Harness:** umask privado al clonar dejó el entrypoint en 0600; se corrigió a 0644 y el clone de reproducción usa 022 antes de volver a 077. Invocar varias veces el CLI en un mismo proceso retenía su lock; ahora cada acción usa un proceso, como en operación real. La red interna del destino de restore no publicaba su puerto: se usó una red propia con publicación exclusiva en loopback. Se corrigió también un supuesto de capitalización del header X-Real-IP en el test nuevo conforme al JSON observado; no se relajó el comportamiento de producción.
4. **Pendiente fuera de alcance:** npm ci reportó 23 vulnerabilidades (6 moderadas, 14 altas, 3 críticas). No se ejecutó otra auditoría ni se actualizaron dependencias. El build aprobado no demuestra seguridad de dependencias ni autoriza publicación.

## Diferencias deliberadas y límites

La prueba usa el proyecto `guteli-ticket02`, redes propias, dos archivos ext4 nuevos de 7 GiB con UUID distintos, puertos loopback y TLS con CA interna. Compose de producción se validó sin iniciar sus puertos públicos ni ACME. `ops.py` permaneció idéntico; el harness selecciona el Compose aislado y ejecuta clientes PostgreSQL 17 en contenedores, conservando el destino local exacto de restore. No se instaló un cliente PostgreSQL dentro de la VM.

La app proviene del commit 9477d74 y el harness aplica explícitamente las dos correcciones del proxy de 667b927. La ejecución se realizó por fases, continuando desde el fallo corregido; no se afirma una segunda ejecución completa desde cero. Los contratos y las funciones originales se conservaron. La evidencia de Ticket 01 y las 158 coincidencias iniciales de sus manifiestos se reutilizaron.

Quedan **sin verificar en Oracle** cuota/costo, hardware A1, discos reales, reinicio de VM, límites bajo carga, firewall/ingress externo, DNS, ACME/renovación TLS y operación programada. `ops.health` comprueba DB/app/esquema; el proxy se verificó por separado. Ningún resultado habilita comercio, pagos, WhatsApp, despliegue ni Ticket 03.

## Reproducción y conservación

- Harness: [docker_drill.py](../../../tests/oracle/docker_drill.py), fotografía de este ensayo. Requiere VM local desechable autorizada, herramientas existentes, las imágenes ya construidas y root sólo para loop mounts/permisos de fixtures. No ejecutarlo en Oracle ni en otro servidor; sus paths/proyecto son exclusivos. Secuencia desde raíz nueva: setup, smoke, faults, operations, recovery_app. Las etapas auxiliares se usaron para continuar fallos sin repetir trabajo aprobado.
- Regresión de proxy: `GUTELI_TEST_DOCKER_HOST=unix:///ruta/local/docker.sock GUTELI_TEST_CADDY_IMAGE=<referencia de images.lock.json> node tests/oracle/caddy-runtime.mjs`. Sólo acepta socket Unix e imagen Caddy fijada; contenedor temporal sin red.
- Build: contexto de `git archive 9477d74`, Dockerfile Oracle, `NODE_IMAGE` fijada, `--platform linux/arm64`, label `org.opencontainers.image.revision=9477d74c8081d3163b1f789e1bf8b5e1c13e67ee`; primero target builder y luego runtime con caché. Se usó builder legacy existente (`DOCKER_BUILDKIT=0`), sin instalar buildx.
- Logs privados/builds en host: `/private/tmp/guteli-ticket02-xdp8p2kh`. VM: `/tmp/guteli-ticket02-xdp8p2kh`; data.ext4 y backups.ext4 conservan los volúmenes desmontados. Secretos aleatorios, dumps, respaldos e imágenes ficticias no se publican.
- Los cinco contenedores de servicio creados por este ensayo quedaron detenidos; dos volúmenes de archivo desmontados sin borrar contenido. Contenedores, redes, imágenes y archivos de otros proyectos intactos. Colima devuelto a Stopped y contexto activo default. Sin prune.

## Git

Rama exclusiva: `origin/infra/oracle-always-free-preparation`, remoto `https://github.com/A625A/guteli-bakery.git`. Checkpoint 1: `9477d74`; checkpoint 2: `667b927`; ambos pushes verificados con igualdad de SHA local/remoto. El commit de cierre documental se identifica en el historial de esta rama y en el reporte final (no se puede incluir su propio hash dentro de su contenido).
