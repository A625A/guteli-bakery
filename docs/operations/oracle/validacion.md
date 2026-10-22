# Reporte de validación y entrega

Preparación del 17–18 de octubre de 2026, America/Guatemala. **PREPARADO LOCALMENTE, con validación parcial local. NO instalado ni validado en Oracle.**

## Estado frente a la solicitud original

| Parte | Resultado | Categoría / pendiente |
|---|---|---|
| Auditoría, ramas/worktrees, Tickets10–14 | Base 082959d identificada; Admin UX 2.0 y Ticket 12 ya integrados en ese commit; main y worktree UX preservados | VALIDADO LOCALMENTE; referencia remota sólo observada en refs locales |
| Arquitectura, costos y guía Oracle | VM independiente, Caddy→Next→Postgres, volúmenes separados, guía con aprobaciones y fuentes | PREPARADO LOCALMENTE; cuota/capacidad/costos reales no consultados |
| Demo comercial | Servidor rechaza pedidos y checkout por defecto; catálogo/carrito sin formulario personal; noindex y mensajes claros | VALIDADO LOCALMENTE, UI390/1440 y APIs403 |
| Pagos y WhatsApp | Compose fuerza false; proveedor de pagos sigue bloqueado; automatización deshabilitada en demo | VALIDADO LOCALMENTE para guardas; sin llamadas/sends reales |
| Docker, volúmenes, red | Compose separado, UID no root, bind sin creación implícita, UUID/PG_VERSION/marcadores, sin puertos app/DB, reescritura proxy | PREPARADO LOCALMENTE; Docker/Compose/Caddy/Linux ARM64 no ejecutados |
| Seguridad Ticket 12 | Sin cambios a reglas MFA/roles/último OWNER; headers privados y logs seguros conservados | Integración173, admin11 y TLS1 aprobados localmente |
| Health/readiness | Público sin diagnóstico sensible; esquema/versiones y acceso a almacenamiento, chequeos internos | Pruebas de errores y demo aprobadas; montaje Linux real pendiente |
| Actualización y recuperación | SHA/imagen inmutable, release limpia, esquema exacto, respaldo previo, exclusión mutua, simulación por defecto | Guardas locales probadas; actualización real de contenedores pendiente |
| Backups | Dump+imágenes+manifiesto, cifrado autenticado, límite de 4 sin borrado, timer semanal preparado | Cifrado/restore nativo probado; ciclo Docker/volúmenes/VM perdida pendiente |
| Cuentas y catálogo | Procedimiento OWNER/ADMIN/MFA y lista de aprobación | PREPARADO; sin cuentas reales ni catálogo aprobado |
| Prácticas | Cinco pedidos PRUEBA con cinco estados, pickup/delivery y dos productos; ninguna notificación ni pago | CLI probado en base sintética; segunda carga rechazada |
| Limpieza de fixtures | Plan inventario→backup→simulación→autorización→integridad→recuperación | PREPARADO; no comando destructivo ni limpieza ejecutada |
| DNS/HTTPS/monitor | Caddy/Let's Encrypt preparados, DuckDNS y UptimeRobot investigados | Nombre registrable, TLS público y correo pendientes de autorización/validación |
| Documentación/mantenimiento | Arquitectura, guía paso a paso, runbooks, costos, matriz y checkpoint | PREPARADO LOCALMENTE |

## Evidencia ejecutada

Todos los archivos siguientes están en `artifacts/oracle-preparation/`. Las ejecuciones iniciales fallidas se conservan; no son el resultado final.

| Comprobación | Resultado observado | Archivo |
|---|---|---|
| Baseline unitario |295 pasaron,3 fallaron: dos contratos README y timeout del CLI |baseline-unit.txt|
| Unitarias finales |317 pasaron,2 fallaron; ambos son los mismos contratos README preexistentes |unit-final.txt|
| Integración PostgreSQL 17 |173/173 aprobadas |integration.txt|
| Lint |Aprobado |lint-final.txt|
| Typecheck |Aprobado |typecheck-final.txt|
| Build Next standalone macOS ARM64 / Node23.9 |Aprobado; usa valores ficticios exclusivamente de build |build-final.txt|
| Guardas operativas Python |8/8 aprobadas: cifrado/tamper, montaje ausente, restore seguro, esquema, permisos, Docker local, install y app detenida |ops-tests-final.txt|
| Demo standalone |3/3 aprobadas; 390/1440px, subtotal/persistencia carrito, sin PII, APIs403, admin401, readyz200 |browser-demo-final.txt y demo-cart-390/1440.png|
| Regresión general navegador |95 pasaron,7 fallaron,1 skip,11 no corrieron |browser-regression.txt|
| Administración separada |11/11 aprobadas, incluye MFA/roles/catálogo/usuarios/pedidos |browser-admin.txt|
| Resumen bajo configuración explícita |10 aprobadas,1 skip propio del modo alternativo |browser-summary-explicit.txt|
| Portada tras timeout inicial |1/1 aprobada |browser-homepage-recheck.txt|
| Producción TLS local |1/1 aprobada: cookies secure, MFA, Origin, privacidad |production-tls.txt|
| Fixtures |5 creados; recarga rechazada sin alterar los 5 |practice-orders.txt, practice-rejection.txt|
| Restore DB+imágenes |PASS; hashes/roles/MFA sintético/filas/pendientes/esquema iguales; target existente rechazado; 1.66 s local |restore-drill-final.txt|
| Reinicio PostgreSQL nativo |5 pedidos/5 PRUEBA conservados |native-restart.txt|
| Simulación update/restore |Sin mutaciones ni conexiones |update-dry-run.txt, restore-dry-run.txt|

**No sumar estos números como una única suite**: varias ejecuciones se solapan. El restore nativo prueba `pg_dump`, cifrado, verificación y restauración, **no** la orquestación Docker del backup. Su duración no es un RTO de Oracle. Los registros MFA de la prueba de copia son sintéticos; el login/MFA real de aplicación se verifica aparte en admin/TLS.

### Fallos históricos y limitaciones

**Actualización Ticket 01, 18/10/2026:** los contratos README, la carrera de captura y la cobertura de headers quedan cerrados localmente. [Informe y evidencia dirigida](../../../artifacts/oracle-preparation/ticket-01/RESULTADO.md): 7 unitarias, 3 navegador y 1 privacidad aprobadas. Los resultados generales de la tabla anterior son históricos y no fueron reejecutados. Docker/Oracle continúan pendientes.

- Los dos fallos unitarios exigen cadenas/comandos Docker del README antiguo. Existían antes de la implementación; no se cambiaron assertions para ocultarlos. El timeout baseline del CLI no se repitió en la ejecución secuencial final.
- Cuatro fallos de resumen en la suite general esperaban handoff habilitado, pero se ejecutaron bajo modo público demo. La ejecución dirigida con NEXT_PUBLIC_DEMO_MODE=false pasó sus diez escenarios; apertura de WhatsApp está interceptada en las pruebas, no se envió ningún mensaje.
- El timeout de setup de portada pasó al reejecutarse. La captura móvil de `artifacts.spec.ts` conserva un aviso de hidratación: el diff señala `caret-color: transparent` durante screenshot. En esa ejecución aún no se había corregido el harness; quedó registrado para Ticket 01; la continuación lo resolvió esperando hidratación antes de capturar.
- Persistencia por reinicio Docker falló porque no hay daemon. El comando `docker compose` tampoco está disponible; no se instaló plugin ni se arrancó Docker. Sólo se verificaron estructura YAML y sintaxis shell. No se probó `compose config --quiet`, Caddy validate, montaje Linux, UID en las imágenes ni arranque/reinicio de los tres contenedores.
- Node local 23.9/macOS ARM64 no certifica Node 22/Linux ARM64/sharp. El candidato necesita build y pruebas reales en ese entorno.
- En la preparación inicial, la suite de headers de `tests/privacy` no se volvió a ejecutar: la prueba TLS existente y regresiones de integración cubren parte de esa seguridad, no equivalen a todos los casos. Ticket 01 posteriormente ejecutó esa suite (1/1), cerrando esa brecha sin repetir las demás.
- Capturas históricas que la suite regeneró se conservaron aparte en `regression-captures/`; sus archivos originales fueron restituidos desde HEAD, sin alterar capturas ajenas en el diff.

## Pendientes externos y autorizaciones

No se comprobó cuota/capacidad, costo de IP elegida, UUID/montaje real, firewall/NSG, hostname registrable, renovación TLS, correo de monitor, timers, backup tras pérdida de VM ni rollback en Oracle. No hay registro DNS, cuentas reales, emails, automatización comercial ni recursos creados.

Antes de instalar/publicar se requieren las autorizaciones enumeradas en [lanzamiento](lanzamiento.md): recursos/costos, versionado, SSH/software/firewall, inicialización/migraciones, catálogo/cuentas/fixtures, DNS/TLS/publicación, monitor/correos/timers y cualquier restauración/limpieza real. Pagos, WhatsApp y apertura comercial quedan fuera. Q0 es condicionado, no una promesa.

La primera instalación debe usar el candidato que conserva la integración Admin UX 2.0/Ticket 12 ya presente; no existe un merge pendiente entre esas dos bases observadas. Sí falta aprobación del candidato final y validación en VM. Tickets 10/11/14 no se cierran como producción comercial.

## Cierre y continuación económica

[Checkpoint compacto](CHECKPOINT.md) contiene fuentes/evidencia/comandos y próximos pasos. [Seis tickets restantes](../../../.scratch/oracle-remaining/README.md) separan discrepancias locales, Linux ARM64 y acciones futuras autorizadas. No rehacer el trabajo ya demostrado; sólo invalidar evidencia si cambian los archivos que cubre o el entorno relevante.
