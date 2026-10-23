# Checkpoint — Oracle Güteli

22/10/2026, America/Guatemala. **INTEGRACIÓN ORACLE + ADMIN UX 2.0 + TICKET 12 VALIDADA LOCALMENTE.** Ticket 02 conserva su cierre local Docker/Linux ARM64. No instalado en Oracle. Este archivo es el ledger de continuidad; leerlo antes de investigar o ejecutar pruebas.

## Continuación vigente — integración del 22/10/2026

- Rama nueva `main-integracion-oracle-admin-ux-20261022`, desde `origin/main` en `082959d`; `main` local permanece en `4845ecf` y no se modifica ni publica.
- Admin UX `18703b1` y Ticket 12 ya eran ancestros de main remoto y Oracle. Se incorporaron sólo los tres commits Oracle hasta `6eb72da`, mediante merge `db6c7e38d760b694e36f2b97482cacb36bc875c6`, sin conflictos ni duplicación. Árbol funcional idéntico a Oracle.
- Nuevas pruebas aprobadas: 152 unitarias dirigidas, 32 integración, 8 operación Python, 3 navegador demo; lint, typecheck y build. Evidencia ARM64 y Admin UX reutilizada; sin suites/auditorías completas ni agentes adicionales.
- [Informe, hashes, incidencias de entorno y pendientes](INTEGRACION-2026-10-22.md). Los únicos cambios posteriores al merge son este checkpoint y el informe.
- Autorización vigente: commits y push exclusivamente a la rama nueva. Sin merge/push a main, despliegue Oracle, activación comercial/pagos/WhatsApp ni modificación del hackathon. Worktrees, products/ y evidencias previas preservados.
- Pendiente antes de main: revisión y autorización del merge, confirmar base remota vigente. El reporte histórico de vulnerabilidades y los tickets Oracle 03–06 siguen abiertos para la aprobación de producción/despliegue.

Las secciones siguientes conservan el historial y las autorizaciones de sesiones anteriores; para esta integración prevalece la continuación vigente.

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
- 03–06: requieren decisiones, entorno o autorización futura. No iniciar automáticamente.
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
