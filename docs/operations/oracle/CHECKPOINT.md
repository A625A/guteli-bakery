# Checkpoint — Oracle Güteli

21/10/2026, America/Guatemala. **TICKET 02 EN VALIDACIÓN LOCAL.** No instalado en Oracle. Este archivo es el ledger de continuidad; leerlo antes de investigar o ejecutar pruebas.

## Identidad y límites

- Worktree: `/Users/andrewarana/.codex/worktrees/guteli-oracle-always-free/Guteli Bakery`.
- Rama: `infra/oracle-always-free-preparation`; base/HEAD `082959dafe57cf1ec5fdfed00a0aa71f99de64b4`. Cambios deliberadamente SIN COMMIT.
- Esa base ya integra Admin UX 2.0 y Ticket 12. No se hizo merge ni se requiere repetir esa integración observada.
- Main original y worktree Admin UX permanecen separados. No tocar hackathon, Oracle/SSH/OCI, datos reales, servicios pagos ni enviar mensajes. No commit/push/merge/deploy ni tickets GitHub.
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
- 02: Docker daemon/Compose/Caddy no disponibles. No hubo build Linux Node 22, mounts/UID reales ni ciclo Docker. Local es macOS ARM64 Node23.9 y PostgreSQL 17.
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

## Cierre de esta sesión

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
