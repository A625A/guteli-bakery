# Checkpoint — Oracle Güteli

## Continuación vigente — GitHub y seguridad (24/10/2026)

**DEPENDENCIAS PREPARADAS TÉCNICAMENTE: audit completo0 / producción0; validación local y ARM64 aprobada. PUBLICACIÓN/DESPLIEGUE NO AUTORIZADOS.** Este estado y la autorización siguiente sustituyen los límites de las sesiones históricas.

- Única rama/worktree: `infra/oracle-always-free-preparation`, `guteli-oracle-always-free/Guteli Bakery`. Autorizados commits y push solo a su rama origin; sin merge/push main, Oracle/hackathon ni activaciones. Un agente, ningún ticket nuevo.
- Primer push realizado y verificado por SHA: `2b9db89` + `c4ef532` + `d374b111610ff2a2643d76d2b3a370ecc6b69fe6`. Fast-forward desde `6eb72da`. Tickets04/05 y fotografías preservados; aceptación comercial04 todavía pendiente.
- Segundo grupo de trabajo: package/lock y cierre de remediación, en el commit que contiene esta sección. [Informe vigente](plan-remediacion-ticket-03.md), [reporte histórico actualizado](dependencias-ticket-03.md) y [evidencia](../../../artifacts/oracle-preparation/ticket-03/remediation-evidence.json). Next16.4.2, sharp0.35.5, Zod4.6.6, Vitest4.1.12, Vite6.4.5; overrides puntuales comprobados. React/Auth/PG/Drizzle conservados.
- Resultado: npm ci/grafo, TypeScript, ESLint,100 unitarias,40 integración y5 navegador aprobados;16 migraciones y un nuevo build de producción ARM64. Runner verificado con librsvg2.63.2; PG/Caddy/HTTPS interno, privacidad, rechazo403, carrito/fotos/MFA/roles y persistencia tras reinicio. Sin órdenes ni outbox. No repetir estas pruebas si hashes/dependencias pertinentes no cambian.
- Histórico23 entradas totales/12 filtro producción → candidato0/0. Incluye cambio de metadatos: braces retirado upstream y parche nuevo de Zod. **Se levanta solo el bloqueo npm del candidato**; no certifica OS/Oracle ni disponibilidad futura de advisories.
- Persisten cuota/uso/costo/capacidad y hostname/DNS/HTTPS público03, revisión/aprobación real de dueños04 e instalación/operación Oracle no autorizadas. Tickets05 externo y06 no ejecutados. Comercio, cobros y WhatsApp siguen apagados.
- Entornos nuevos detenidos y conservados: nativo `/private/tmp/guteli-security-vwdel3i6/pgdata` (loopback55447), VM `/tmp/guteli-security-vwdel3i6`, imagen local y evidencia privada. Colima detenido como al inicio. No se modificaron bases/respaldos/volúmenes anteriores; logs/capturas/secretos no se versionan.
- Cambios locales de cuota/hostname03 y evidencias anteriores permanecen separados. Main local conserva `061f036`; no se importó ni eliminó su informe exclusivo de integración. El árbol de esta rama sigue sin incluir ese archivo histórico de main.

## Historial de sesiones anteriores

23/10/2026, America/Guatemala. **TICKET 05: FOTOGRAFÍAS Y PREPARACIÓN LOCAL COMPLETADAS; INSTALACIÓN ORACLE BLOQUEADA Y NO AUTORIZADA.** Pendientes 03/04 y vulnerabilidades sin remediar. Ticket 06 no iniciado. Leer la continuación vigente siguiente antes del historial.

## Continuación vigente — Ticket 05 (23/10/2026)

- Exclusivamente `infra/oracle-always-free-preparation` en `guteli-oracle-always-free/Guteli Bakery`, un solo agente. **Commits locales de Ticket 05 autorizados; push/merge, Oracle/SSH/OCI, despliegue y comercio/pagos/WhatsApp no autorizados.** Esta continuación prevalece sobre permisos históricos de otras sesiones.
- [Informe](../../../artifacts/oracle-preparation/ticket-05/RESULTADO.md) y [secuencia de instalación futura](instalacion-ticket-05.md). Botón Agregar fotografía al crear/editar, preview/descarte, reemplazo/eliminación al guardar. Reutiliza APIs y almacenamiento, una fotografía activa. Error de imagen conserva anterior y selección; datos/foto son dos operaciones y se informa resultado parcial.
- Verificación nueva: imágenes14 + bloqueo comercial13, integración imágenes12, navegador2 (1440/390 px, OWNER/ADMIN/MFA, creación, errores, reintento, recarga y catálogo renderizado); ESLint/TypeScript/diff aprobados. No build ARM64, Docker, audit npm ni suites generales. [Evidencia y límites](../../../artifacts/oracle-preparation/ticket-05/evidence.json).
- Base inicial `6eb72da`; otra operación avanzó la rama a `2b9db89` (Ticket 04) durante esta sesión. Se preservó. Ancestros Admin UX/Ticket12/01/02 confirmados; infra/scripts/lockfile intactos. Fotos05 versionadas localmente en `c4ef53274820e6f3205f092a651123c0493e0bd9`; documentación03 y remediación siguen pendientes. No hay release autorizado para instalación.
- 01/02 satisfechos solo localmente. 03: cuota/uso/costo/capacidad/hostname pendientes y **23 vulnerabilidades bloquean publicación** (12 filtro producción; reporte conservado sin remediación). 04: aceptación real pendiente. Pruebas nuevas de fotos no cierran el ensayo general de dueños ni recuperan sus cinco PRUEBA.
- Nuevo PostgreSQL ficticio loopback55445 en `/private/tmp/guteli-ticket05.PwxL7n/pgdata`: detenido, archivos conservados; Playwright terminó servidor/navegador. Cluster histórico incompleto preservado. Sin datos reales, main/otros worktrees/hackathon ni Ticket06.
- Próximo paso requiere cerrar remediación/03/04 y autorización específica de Git/SHA, recursos gratuitos independientes, SSH/software/firewall/reboot, DB/migraciones/cuentas y hostname/DNS/HTTPS/publicación de demo. El checklist externo de05 permanece sin marcar.

## Historial — integración del 22/10/2026

- Rama nueva `main-integracion-oracle-admin-ux-20261022`, desde `origin/main` en `082959d`; `main` local permanece en `4845ecf` y no se modifica ni publica.
- Admin UX `18703b1` y Ticket 12 ya eran ancestros de main remoto y Oracle. Se incorporaron sólo los tres commits Oracle hasta `6eb72da`, mediante merge `db6c7e38d760b694e36f2b97482cacb36bc875c6`, sin conflictos ni duplicación. Árbol funcional idéntico a Oracle.
- Nuevas pruebas aprobadas: 152 unitarias dirigidas, 32 integración, 8 operación Python, 3 navegador demo; lint, typecheck y build. Evidencia ARM64 y Admin UX reutilizada; sin suites/auditorías completas ni agentes adicionales.
- [Informe, hashes, incidencias de entorno y pendientes](INTEGRACION-2026-10-22.md). Los únicos cambios posteriores al merge son este checkpoint y el informe.
- Autorización vigente: commits y push exclusivamente a la rama nueva. Sin merge/push a main, despliegue Oracle, activación comercial/pagos/WhatsApp ni modificación del hackathon. Worktrees, products/ y evidencias previas preservados.
- Pendiente antes de main: revisión y autorización del merge, confirmar base remota vigente. El reporte histórico de vulnerabilidades y los tickets Oracle 03–06 siguen abiertos para la aprobación de producción/despliegue.

Las secciones siguientes conservan el historial; prevalece la autorización de consolidación del Ticket 05.

## Identidad y límites

- Worktree: `/Users/andrewarana/.codex/worktrees/guteli-oracle-always-free/Guteli Bakery`.
- Rama: `infra/oracle-always-free-preparation`; base histórica `082959dafe57cf1ec5fdfed00a0aa71f99de64b4`. Preparación y Ticket 01 publicados en `9477d74`; correcciones Docker/ARM64 en `667b927`; el cierre documental está en el siguiente commit de esta rama.
- Esa base ya integra Admin UX 2.0 y Ticket 12. No se hizo merge ni se requiere repetir esa integración observada.
- Main original y worktree Admin UX permanecen separados. No tocar hackathon, Oracle/SSH/OCI, datos reales, servicios pagos ni enviar mensajes. La autorización actual permite sólo commits/pushes a la rama de preparación. Sin merge/deploy ni tickets GitHub.
- Prompt original: `/Users/andrewarana/.codex/attachments/816f4194-8fdb-45e1-b3fa-7f51110cd472/Pasted text.txt`. La instrucción posterior limita el trabajo a preservar resultados, cierre y tickets restantes.

## Terminado y evidencia reutilizable

- Auditoría de base, diseño independiente, investigación oficial y límites/costos: [arquitectura](arquitectura-costos.md), [guía](guia-oracle.md). Cuota real compartida y capacidad desconocidas; no prometer Q0.
- Demo cerrada en servidor antes de DB/parseo: pedidos y las tres rutas checkout. Catálogo/carrito visibles, sin formulario personal. Pagos/WhatsApp deshabilitados. Seguridad existente/MFA/roles conservada.
- Infra preparada: `infra/oracle/` contiene Dockerfile, Compose separado, Caddy, entrypoints, ejemplos y timers. Persistencia sin creación silenciosa, usuarios no root, puertos privados, límites y secretos externos.
- Operación: `scripts/oracle/ops.py` con simulación por defecto, Docker forzado local, preflight de montaje/UUID/permisos/espacio, esquema exacto, install/update manual, backup cifrado/autenticado y restore a destino nuevo; CLI de cinco pedidos PRUEBA aislados.
- Revisiones previas infra/demo ejecutadas. Hallazgos corregidos: contextos Docker remotos, UID del secreto PG, errores persistentes de backup, margen de espacio, redirect HTTPS, espera de readiness, instalación sobre app existente, respeto a app detenida y copy comercial de portada. No repetir estas auditorías sin cambio relevante.
- [Matriz de validación](validacion.md) es la fuente de resultados: unitarias317+2fallos heredados, integración173, ops8, demo3, admin11, TLS1, resumen10, portada1, restore nativo completo e imágenes, reinicio PostgreSQL. Lint/typecheck/build aprobados. No sumar suites que se solapan.
- Evidencia: `artifacts/oracle-preparation/`; sufijo `-final` identifica la ejecución final cuando existe. `manifest.json` registra hashes actuales para detectar cambios posteriores; NO certifica retrospectivamente el hash exacto al iniciar cada prueba.

## Abierto y próximos pasos

[Índice de seis tickets](../../../.scratch/oracle-remaining/README.md): 01 discrepancias locales; 02 Linux ARM64/Docker; 03 cuota/hostname; 04 aceptación dueños; 05 instalación autorizada; 06 operación/recuperación Oracle. Cada uno conserva dependencias y criterios verificables. Ninguno autoriza acceso externo.

- 01: **CERRADO LOCALMENTE el 18/10/2026.** README 7/7 sin modificar assertions; captura desktop/mobile + regresión controlada 3/3; privacidad 1/1. Ver cierre siguiente. No repetir estas pruebas sin cambios relevantes.
- 02: **CERRADO LOCALMENTE el 21/10/2026.** Docker Linux/aarch64 virtualizado, Node22, Caddy, mounts/UUID/permisos, reinicio, respaldo y recuperación verificados. [Resultado](../../../artifacts/oracle-preparation/ticket-02/RESULTADO.md). No sustituye Oracle.
- 03: decisiones de cuota/hostname pendientes; documentación posterior conservada localmente fuera de este commit.
- 04: preparado sobre evidencia; ensayo interactivo bloqueado y aceptación de dueños pendiente. Ver [reporte](../../../artifacts/oracle-preparation/ticket-04/RESULTADO.md).
- 05: fotografías/preparación local versionadas; instalación bloqueada. Ver [reporte](../../../artifacts/oracle-preparation/ticket-05/RESULTADO.md).
- 06: no iniciado.
- No se cierra producción comercial ni Tickets 10/11/14 por haber preparado archivos.

## Entorno sintético conservado

Cluster exclusivo de esta tarea: `/private/tmp/guteli-oracle-validation.WyjKLo/pgdata`, loopback `127.0.0.1:55439`, usuario `guteli_test_operator`, datos ficticios. `guteli_test` fue la base desechable de suites; `guteli_practice_validation` conserva cinco PRUEBA y fixtures; restores `guteli_restore_drill_*` son destinos nuevos conservados. Uploads de práctica en el mismo directorio temporal. Consultar `artifacts/oracle-preparation/local-environment-status.txt` para el estado al entregar; no asumir que sigue iniciado. No usar estas credenciales/configuración trust en producción. No se borraron datos.

Reproducciones específicas están en `tests/oracle/test_ops.py`, `tests/oracle/restore_drill.py`, `tests/oracle-browser/demo.spec.ts` y `playwright.oracle-demo.config.ts`. Leer primero la evidencia y el ticket; no ejecutar scripts de restore contra otro entorno ni copiar comandos a producción.

## Decisiones de ejecución

- Ruling: usar `to-tickets` como propuesta Markdown local, sin tracker/quiz bloqueante — el usuario autorizó archivos locales y pidió avanzar con mínima repetición — si la granularidad no sirve, ajustar sólo el ticket correspondiente.
- Ruling: aplicar `executing-plans` al cierre con un implementador y una revisión final acotada; conservar este ledger y evidencia sin commits ni borrado de workspace — instrucciones explícitas del usuario prevalecen sobre automatismos de la skill — recuperación depende de preservar este worktree, no de Git.
- Ruling: no usar `writing-plans` ni generar un plan adicional para trabajo ya implementado; no usar `subagent-driven-development` por ticket — sólo faltan cierre y fronteras delimitadas — un ticket con nueva complejidad necesitará su plan al retomarse.
- Ruling: reutilizar pruebas válidas y registrar fallos/límites sin ocultarlos — no hubo cambios funcionales durante la reorganización — la evidencia Linux/Oracle sigue pendiente y no se sustituye por evidencia macOS.

## Protocolo de continuación

1. Confirmar worktree/rama y leer sólo el ticket elegido + matriz relevante.
2. Comparar hashes del manifiesto para los archivos implicados; cambios de entorno invalidan únicamente la evidencia dependiente.
3. Resolver el primer pendiente autorizado con un implementador. Registrar cambio, comando/prueba dirigida, resultado y límites aquí y en el ticket.
4. No reiniciar auditoría, investigación ni suites completas por cambio de sesión. No crear agentes adicionales salvo independencia y beneficio concreto.

## Cierre histórico de la sesión inicial (18/10/2026)

- Revisión final independiente de los diez documentos de entrega: sin hallazgos accionables; alcance y límite en `artifacts/oracle-preparation/closure-review.txt`. No reaudita código.
- PostgreSQL sintético detenido correctamente; archivos y bases conservados.
- Main sigue en 4845ecf con sólo `products/` previo sin seguimiento; Admin UX sigue limpio en 082959d. Candidato sigue en 082959d sin commits.
- `next-env.d.ts` restituido a HEAD después de las pruebas dev; no cambio funcional.
- Se ejecutó únicamente higiene de diff/enlaces y hashes para este cierre documental. No se repitieron suites aprobadas.

## Continuación — Ticket 01 cerrado (18/10/2026)

- Alcance exclusivo: README y `tests/browser/artifacts.spec.ts`, más estado/documentación/evidencia del ticket. Código de aplicación e infraestructura conservados. No se delegó ni se repitió auditoría.
- Se restauró el flujo Compose de desarrollo documentado y se aclararon secretos, provisioning explícito, seed ficticio y diferencia con Oracle. **Los dos fallos heredados ahora pasan; el archivo de assertions permanece idéntico.** Suite dirigida 7/7, sin nueva suite unitaria completa.
- La captura móvil aislada pasó inicialmente: falla intermitente. Una regresión con scripts demorados demostró diez escrituras temporales de Playwright antes de hidratar. `captureMenu` ahora espera que el botón del catálogo esté habilitado; se conserva la detección de errores de consola. Caso controlado RED→GREEN y recorridos desktop/mobile: 3/3. Capturas nuevas separadas mediante `GUTELI_SCREENSHOT_ROOT`; originales preservados.
- Privacidad pendiente cerrada: configuración existente sin cambios, 1/1; su build de producción requerido también pasó. Lint sólo del harness aprobado. Resultados históricos anteriores se conservan; no afirmar que se reejecutó o pasó la regresión general.
- [Informe del ticket](../../../artifacts/oracle-preparation/ticket-01/RESULTADO.md), logs y manifiesto incremental en `artifacts/oracle-preparation/ticket-01/`. El manifiesto de preparación original no se reemplazó; para los archivos cambiados usar el del ticket.
- PostgreSQL ficticio de pruebas nuevamente detenido, archivos conservados. Para reiniciarlo se deben pasar explícitamente las opciones `-o '-h 127.0.0.1 -p 55439 -k /private/tmp/guteli-oracle-validation.WyjKLo'`; `pg_ctl start` sin ellas intenta el puerto5432 y falla. No alterar el servicio existente.
- Riesgos externos sin cambio: Docker/Linux ARM64 y Oracle no validados; cuota/costos, contenido y permisos pendientes. **No se inició Ticket 02. Sin commit/push/merge/deploy ni acceso Oracle/hackathon.**

## Continuación — Ticket 02 (21/10/2026)

- Autorización actual sustituye el límite histórico de Git: commits y pushes exclusivamente a `origin/infra/oracle-always-free-preparation`. Sin merge, force push, Oracle, despliegue público ni Ticket 03.
- Checkpoint 1: preparación previa revisada; 158 archivos coinciden con los manifiestos originales, sin repetir pruebas válidas. Se preservan código, Ticket 01 y documentación. Publicación por lista explícita; logs crudos, capturas, bases, respaldos y secretos quedan locales. Los enlaces a evidencia excluida sólo funcionan en este worktree.
- Remoto comprobado: `https://github.com/A625A/guteli-bakery.git`; rama de preparación inicialmente ausente. Base `082959dafe57cf1ec5fdfed00a0aa71f99de64b4`.
- Docker local recuperado iniciando el perfil existente Colima con `--activate=false --save-config=false --ssh-config=false`; contexto activo `default` conservado. Docker Engine 29.5.2 Linux/aarch64; Compose 5.5.0 independiente. Sin tocar contenedores de otros proyectos.
- Ejecución ligera: un implementador, ledger existente y pruebas dirigidas; sin nuevo plan ni borrado de evidencia.

- Checkpoint 1 publicado y verificado por `git ls-remote`: `9477d74c8081d3163b1f789e1bf8b5e1c13e67ee`.
- Checkpoint 2 preparado: build/runtime Linux ARM64 aprobados; digests fijados. Caddy corrigió EPERM con `NET_BIND_SERVICE` en el bounding set y dejó de anunciar HTTP/3 en el puerto interno no publicado. Regresiones Docker RED→GREEN; contratos Compose 3/3.
- Instalación, reinicio persistente, guards de almacenamiento/esquema, update con backup cifrado y restore Docker pasaron. La app recuperada sirve `/readyz` 200 con la DB y uploads restaurados. Evidencia agregada sin secretos: `artifacts/oracle-preparation/ticket-02/evidence.json`. Cierre documental pendiente; no iniciar Ticket 03.

## Cierre — Ticket 02 (21/10/2026)

- **Cerrado sólo localmente.** [Resultado y límites](../../../artifacts/oracle-preparation/ticket-02/RESULTADO.md), [evidencia agregada](../../../artifacts/oracle-preparation/ticket-02/evidence.json), [digests](../../../infra/oracle/images.lock.json). Docker Engine29.5.2/Compose5.1.4, Node22.23.4, PostgreSQL17.11 y Caddy2.11.7 en Linux ARM64 bajo Colima VZ; no emulación de ISA ni Oracle.
- Build y runtime ARM64 aprobados. Configuración producción y Caddyfile exacto validados. TLS del ensayo usa CA interna y puertos loopback. Dos correcciones: capacidad mínima del binario oficial Caddy y desactivación del anuncio HTTP/3 interno.
- Pasaron persistencia tras reinicio, guards de almacenamiento/UUID/esquema, bloqueo demo, install, update con backup (mismo candidato), falla de backup, app detenida, restore cifrado y readiness de app recuperada. Los fallos de harness y su resolución están documentados; no hubo repetición de build ni de suites históricas.
- `npm ci`: 23 vulnerabilidades reportadas (6 moderadas,14 altas,3 críticas), sin triage ni actualización en este ticket. No implica aprobación de seguridad/producción.
- Checkpoint 2 publicado y verificado: `667b927e884c29aaad15a906219d88da9084246c`; checkpoint 1 `9477d74c8081d3163b1f789e1bf8b5e1c13e67ee`. Rama remota exclusiva `origin/infra/oracle-always-free-preparation`. El tercer commit contiene este cierre; su hash se entrega en el reporte final y Git.
- Recursos de prueba detenidos, volúmenes de archivo desmontados y conservados; Colima devuelto a Stopped y contexto activo default; sin limpieza global. Logs privados host `/private/tmp/guteli-ticket02-xdp8p2kh`; archivos y discos de ensayo VM `/tmp/guteli-ticket02-xdp8p2kh`. No publicar secretos, backups, capturas ni logs crudos.
- Decisión de ejecución ligera: un solo agente y revisión propia del diff nuevo y evidencia; sin reauditar preparación anterior ni generar otro plan. Se conservan todos los artefactos previos.
- **Pendiente Oracle:** hardware/capacidad/cuota, discos reales y reboot VM, DNS/ACME/renovación, firewall externo, carga y operación programada. No acceso Oracle, despliegue público, comercio, pagos, mensajes ni avance a Ticket 03.

## Continuación — Ticket 04 (23/10/2026)

- Un solo agente en este worktree/rama, HEAD `6eb72da`. Sin commit/push/merge, Oracle/hackathon, despliegue, cuentas reales ni activaciones. Tickets 01–03 preservados; 05/06 no iniciados.
- [Ficha única](aceptacion-duenos.md): checklist comercial, inventario existente de 10 productos/4 categorías, guía rápida que reutiliza la Guía del dueño, roles, ejercicios ficticios, decisiones y espacio de aprobación. **Ningún criterio comercial marcado como aceptado.**
- Reutilizados admin11/demo3, casos pertinentes de integración y Admin UX móvil/escritorio; 107 archivos relevantes coincidían con manifiesto/base integrada antes de editar. Capturas previas revisadas y enlazadas, sin regenerar.
- Corrección mínima: buscador y 4 rutas privadas de pedidos aceptan las referencias exactas PRUEBA del cargador existente y conservan sufijos minúsculos. No altera identificadores públicos, roles, pagos, catálogo ni datos. Regresión nueva RED6/GREEN10; ESLint dirigido y TypeScript sin build aprobados. No suites completas, Docker/ARM64 ni audit.
- Cinco referencias/estados verificados contra manifiesto original + carga exitosa histórica, **no contra DB actual**. El cluster nativo temporal carece de `PG_VERSION`; no se arrancó, reconstruyó ni limpió. Reunión sobre evidencia disponible; sesión interactiva requiere recuperar entorno ficticio en destino nuevo y verificar solo flujo cambiado.
- Pendientes de dueños: cuatro presentaciones, foto de Nuditos, precios/fotos/disponibilidad/promociones, contacto, horarios, entregas, pagos/políticas, personas OWNER/ADMIN y conservación de PRUEBA. Fixtures afectan métricas; no limpieza automática.
- Estado: **preparación documental/técnica sobre evidencia lista; ensayo interactivo bloqueado; aceptación comercial pendiente.** Publicación mantiene bloqueo por 23 vulnerabilidades npm de Ticket 03. [Reporte y límites](../../../artifacts/oracle-preparation/ticket-04/RESULTADO.md).

## Integración local autorizada — 23/10/2026

La instrucción posterior «mergea al main» autoriza el commit del Ticket 04 y su merge local a `main`. Se conserva el bloqueo de publicación por dependencias y la aceptación comercial pendiente. No autoriza push, deploy, comercio ni acceso Oracle. Los cambios no publicados del Ticket 03 permanecen en el worktree de preparación y no se incluyen en este commit.

Se integran corrección, prueba dirigida, ficha y evidencia agregada. Logs crudos y capturas previas permanecen locales en el worktree de preparación; sus enlaces pueden no resolver en otros checkouts. Las pruebas 10/10, ESLint y TypeScript se reutilizan: los siete archivos coinciden con los hashes de la ejecución final y main no aporta diferencias funcionales ni de dependencias.

## Consolidación local — 23/10/2026

- Autorización actual: commits locales exclusivamente en `infra/oracle-always-free-preparation`; **push y merge pendientes de aprobación posterior**. Sin Oracle, hackathon, deploy ni activaciones. Sustituye únicamente el límite previo de commit del Ticket 05.
- Fotografías y pruebas versionadas en `c4ef53274820e6f3205f092a651123c0493e0bd9`; documentación/evidencia en el commit que contiene esta sección. No es un release autorizado ni remedia dependencias.
- Revisados los cinco archivos TS/TSX del ticket: hashes idénticos a la evidencia final, corroborada con logs originales de 27 unitarias, 12 integración y 2 navegador (1440/390 px). ESLint/TypeScript previos reutilizados. Sin nuevas pruebas de comportamiento ni suites completas: no cambió código después de esa validación.
- Ajustes documentales: Guía del dueño actualizada a Agregar/Quitar/Conservar fotografía y guardado explícito; corregida afirmación sobre rutas de uploads (el listado no quedó capturado). El manifiesto original se conserva como snapshot histórico, no como hashes de los documentos editados después.
- Fuera de commits: documentos/evidencia pendientes de Ticket 03, logs crudos, capturas PNG, resultados temporales de Playwright, bases/uploads y `products/` de main. Se preservan, no se borran. Los secretos de la configuración de prueba son constantes ficticias; no se incluyen credenciales reales.
- Lectura remota previa mediante `git ls-remote`: preparación `6eb72daed77589049828aa3338469ebcbbcea3f6`, main `2c8fe905d1cbb5aaa71bf11ab8cd1e7cf13d1c85`; coincide con las referencias conocidas. Revalidar justo antes de cualquier push futuro.
- Main local permanece en `061f036e9cdd0ba44bf7b90217f10746ea258363`; ya contiene Ticket 04. Esta rama parte de `2b9db89`, sin los tres commits exclusivos de main (dos merges y un informe de integración). No se incorpora ni borra ese informe: la diferencia de árboles que lo muestra ausente no es una eliminación introducida por Ticket 05.
- Preparación local versionada; instalación/publicación y aceptación de dueños siguen bloqueadas o pendientes. 23 vulnerabilidades npm conservadas sin remediar. Ticket 06 no iniciado.
