# Ticket 05 — Fotografías y preparación de instalación

23/10/2026, America/Guatemala. **Fotografías y preparación local completadas. Instalación Oracle BLOQUEADA / NO AUTORIZADA.** Los criterios externos del Ticket 05 no se consideran cumplidos.

## Funcionamiento entregado

- «Agregar fotografía» disponible antes de crear y al editar. Abre el selector de archivos de computadora/celular sin forzar cámara. JPEG/PNG/WebP hasta 8 MB; vista previa local y «Quitar fotografía seleccionada». El selector no sube nada por sí solo.
- «Crear producto»/«Guardar producto» guarda datos y luego aplica la fotografía mediante las APIs existentes. Se conserva **una fotografía activa por producto**, como el contrato existente; no se creó una galería ni otro almacenamiento.
- Edición muestra las fotos guardadas y la nueva seleccionada. Reemplazo explícito al guardar. «Quitar fotografía actual» solo prepara la eliminación, muestra que quedará sin foto y permite «Conservar fotografía» antes de guardar.
- Si falla guardar datos, no se ejecuta cambio de imagen. Si datos se guardan y falla carga/eliminación, informa el resultado parcial, conserva la selección y permite reintentar sobre el mismo producto sin duplicarlo. La foto anterior permanece ante errores de validación/transacción/almacenamiento; el backend existente compensa solo el objeto nuevo. Una conexión perdida después de un commit puede dejar resultado desconocido: el mensaje indica recargar para verificar, no promete rollback de un commit ya confirmado en servidor.
- Fotografías visibles en administrador y catálogo público, con persistencia comprobada al recargar. No se cambia contenido comercial por suposición (Nuditos y derechos/identidad de fotografías siguen pendientes de dueños).

## Seguridad y persistencia reutilizadas

`POST /api/admin/uploads` y `DELETE /api/admin/products/[id]` conservan autorización OWNER/ADMIN, sesión/MFA, origen confiable, límites de carga y versión optimista. Se verificó acceso ADMIN en navegador e integración; sesión anónima/cross-origin/revocación y rate limit en la suite existente.

Servidor: límite multipart y archivo 8 MiB, 24 millones de píxeles, concordancia extensión/MIME/contenedor, decodificación real sharp, rechazo SVG/políglotas y transformación a WebP sin metadata. Claves UUID independientes del nombre recibido, almacenamiento local con nombres físicos seguros y limpieza compensada. No se cambió esta implementación ni se añadió endpoint/servicio/dependencia. Las vulnerabilidades conocidas de Next/sharp siguen bloqueando publicación.

Docker monta uploads persistentes y `ops.py` incluye DB+imágenes/manifiesto en respaldo cifrado/autenticado. `infra/oracle/`, `scripts/oracle/`, package.json y lockfile idénticos a `6eb72da`; Caddy/Compose/digests coinciden además con manifiesto de Ticket 02. Se reutiliza su prueba ARM64 de reinicio/backup/restore. No se repitió build, Docker ni restore; la nueva UI no es una imagen Docker construida. La remediación de dependencias exigirá validación ARM64 afectada antes del release.

## Pruebas nuevas dirigidas

| Comando / alcance | Resultado |
|---|---|
| `node node_modules/vitest/vitest.mjs run tests/unit/image-validation.test.ts tests/unit/commercial-demo.test.ts` | **27/27**: imágenes14 + bloqueo comercial13. |
| `DATABASE_URL_TEST=<DB ficticia loopback> node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/admin-images.test.ts` | **12/12**. Caso añadido: reemplazo y eliminación con fallo forzado de auditoría conservan bytes, metadata y versión; después ADMIN puede reemplazar. |
| `DATABASE_URL_TEST=<DB ficticia loopback> node node_modules/@playwright/test/cli.js test --config playwright.oracle-photos.config.ts` | **2/2**, 1440 y 390 px; OWNER y ADMIN reales de prueba con cambio de contraseña/MFA. |
| ESLint en los cinco archivos TS/TSX de este ticket; `tsc --noEmit --incremental false` | Aprobados, sin build. |
| `git diff --check`, revisión propia del diff y hashes/ancestros | Aprobados. |

Los dos recorridos cubren botón/selector, preview/descarte, creación directa y creación con carga fallida/reintento, rechazo SVG local, error de guardado de datos, error de reemplazo y eliminación, reintento, recarga, API pública y **imagen realmente renderizada en `/menu`**. Verifican 403 `COMMERCIAL_DEMO` en los cuatro POST públicos. Prueba responsive Chromium a 390 px, no dispositivo físico ni Safari/iOS/HEIC; HEIC no es formato admitido.

Primera ejecución de navegador: dos fallos del harness al esperar `{product}` en un endpoint público que devuelve el DTO directamente; corregido sin alterar la API. Luego 2/2. Ejecución final ampliada con render público y creación directa: 2/2 en 30.4 s. Una ejecución intermedia fue cancelada durante preparación al no haberse aplicado aún la ampliación del harness; no cuenta como resultado. Las suites previas no se suman ni se presentan como repetidas. El test largo histórico de catálogo fue adaptado a los nuevos botones, pero no se reejecutó completo.

[evidence.json](evidence.json) y [resumen de ejecuciones](checks.txt). Capturas locales de controles/errores: [390 px](photo-390.png), [1440 px](photo-1440.png); las capturas `preview-*` muestran el drawer y no certifican por sí solas la zona inferior fuera de pantalla.

## Candidato y alcance Git al cierre de implementación

Se inició en `6eb72da`. Durante la sesión una operación ajena avanzó la misma rama a `2b9db89cd8d3b6840ea43d338c5253c96bc85550` (Ticket 04); se preservó y se comprobó que `082959d`, `9477d74` y `667b927` siguen siendo ancestros. Admin UX 2.0/Ticket 12 y correcciones 01/02/04 están incluidos. Fotos/Ticket 05 y parte documental de 03 permanecen locales: **no existe SHA final listo para instalar**.

Este agente no hizo commit/push/merge ni modificó main/otros worktrees/hackathon. Se conservaron cambios previos del Ticket 03 y evidencia 01–04. `next-env.d.ts` volvió a su contenido anterior tras el cambio automático de `next dev`. Sin agentes adicionales, instalaciones de dependencias ni auditoría general.

## Archivos de este ticket

- `src/components/admin/ProductForm.tsx`.
- `tests/integration/admin-images.test.ts`, `tests/browser/admin-catalog.spec.ts`, `tests/oracle-browser/photos.spec.ts`.
- `playwright.oracle-photos.config.ts` (loopback, datos ficticios y comercio/pagos/WhatsApp false).
- `docs/operations/oracle/instalacion-ticket-05.md`, `docs/operations/oracle/CHECKPOINT.md`.
- `.scratch/oracle-remaining/issues/05-instalacion-autorizada.md`, `.scratch/oracle-remaining/README.md`.
- Este directorio de evidencia: reporte, resumen, hashes y capturas. No publicar logs crudos, secretos o bases.

## Preparación y bloqueos

[Secuencia exacta de instalación futura](../../../docs/operations/oracle/instalacion-ticket-05.md): recursos/red, discos/UUID, secretos, release limpio ARM64, SQL explícito, cuentas/MFA, DNS/HTTPS, preflight/install, verificaciones y recuperación. No se ejecutó en Oracle.

01/02 cerrados localmente. **03 pendiente**: cuota/uso/costos/capacidad real y hostname/DNS; 23 vulnerabilidades sin remediar (12 filtro producción), último reporte conservado, no nuevo audit. **04 pendiente**: revisión y aceptación comercial real; esta base de pruebas no recupera el cluster ni los cinco PRUEBA originales.

Antes de instalar: autorizar remediación y cerrar su validación; cerrar ficha Q0/hostname y aceptación de dueños; aprobar archivos/commits/publicación/SHA final; autorizar recursos independientes concretos, SSH/software/firewall/reboot, DB/migraciones/cuentas y DNS/ACME/publicación de demo. No enviar secretos en chat. El ticket se completa solo después de esas autorizaciones y verificaciones reales en Oracle.

## Entorno conservado y detenido

Base nueva exclusiva `guteli_test` en `/private/tmp/guteli-ticket05.PwxL7n/pgdata`, loopback55445, usuario ficticio `guteli_test_operator`. PostgreSQL detenido correctamente; archivos conservados. Uploads de cada ejecución en directorios temporales `guteli-ticket05-uploads-*`; su listado no quedó capturado (`upload_roots: []` en evidence.json). No se certifican aquí sus rutas exactas ni su disponibilidad actual. Servidor/navegador locales de Playwright terminados. No se reparó ni arrancó el cluster anterior de Ticket 04. Logs crudos locales en `/private/tmp/guteli-ticket05.PwxL7n`.

Sin acceso Oracle, instalación pública, servicios pagos, pedidos comerciales/pagos/WhatsApp ni Ticket 06. Las banderas de demo permanecen cerradas.

Las capturas y logs enlazados se conservan solo en el worktree de preparación; no forman parte de estos commits. La guía de instalación enlaza documentos pendientes de Ticket 03: disponibles localmente, todavía no versionados.

## Consolidación local — 23/10/2026

- Autorización actual: commits locales exclusivamente en `infra/oracle-always-free-preparation`; **push y merge pendientes de aprobación posterior**. Sin Oracle, hackathon, deploy ni activaciones. Sustituye únicamente el límite previo de commit del Ticket 05.
- Fotografías y pruebas versionadas en `c4ef53274820e6f3205f092a651123c0493e0bd9`; documentación/evidencia en el commit que contiene esta sección. No es un release autorizado ni remedia dependencias.
- Revisados los cinco archivos TS/TSX del ticket: hashes idénticos a la evidencia final, corroborada con logs originales de 27 unitarias, 12 integración y 2 navegador (1440/390 px). ESLint/TypeScript previos reutilizados. Sin nuevas pruebas de comportamiento ni suites completas: no cambió código después de esa validación.
- Ajustes documentales: Guía del dueño actualizada a Agregar/Quitar/Conservar fotografía y guardado explícito; corregida afirmación sobre rutas de uploads (el listado no quedó capturado). El manifiesto original se conserva como snapshot histórico, no como hashes de los documentos editados después.
- Fuera de commits: documentos/evidencia pendientes de Ticket 03, logs crudos, capturas PNG, resultados temporales de Playwright, bases/uploads y `products/` de main. Se preservan, no se borran. Los secretos de la configuración de prueba son constantes ficticias; no se incluyen credenciales reales.
- Lectura remota previa mediante `git ls-remote`: preparación `6eb72daed77589049828aa3338469ebcbbcea3f6`, main `2c8fe905d1cbb5aaa71bf11ab8cd1e7cf13d1c85`; coincide con las referencias conocidas. Revalidar justo antes de cualquier push futuro.
- Main local permanece en `061f036e9cdd0ba44bf7b90217f10746ea258363`; ya contiene Ticket 04. Esta rama parte de `2b9db89`, sin los tres commits exclusivos de main (dos merges y un informe de integración). No se incorpora ni borra ese informe: la diferencia de árboles que lo muestra ausente no es una eliminación introducida por Ticket 05.
- Preparación local versionada; instalación/publicación y aceptación de dueños siguen bloqueadas o pendientes. 23 vulnerabilidades npm conservadas sin remediar. Ticket 06 no iniciado.
