# Integración de Admin UX 2.0 en main

Integración solicitada explícitamente por el usuario después de publicar `main-admin-ux-2`.

## Revisiones integradas

- `main`: `4845ecfd693eca20a8d5628cfb6796e87acefe9f` (Ticket 12 y README).
- Admin UX 2.0: `18703b1e711507753b1f45aa5c0cf57414ecd250`.
- Base común: `2a73ab5da0edef60af1eabb8a2693f6252b7dd80`.

La integración se preparó en `main-admin-ux-2-integration`, dentro del worktree de Admin UX. El checkout original de Ticket 12, su rama local y su carpeta `products/` se conservaron intactos. La rama publicada `main-admin-ux-2` conserva su commit original.

## Resolución de conflictos

Los únicos conflictos fueron `src/app/admin/page.tsx` y `tests/browser/admin-shell.spec.ts`.

Se conservan navegación, filtros históricos, estadísticas, catálogo y editores de Admin UX. El dashboard consulta también `getOperationsSummary` de Ticket 12 y muestra sus siete comprobaciones bajo **Estado de la tienda**, con sus mensajes y estados originales: Comprobado, Necesita atención, Sin comprobar y Desactivado. Las tarjetas ajustan su ancho y tamaño de texto para conservar legibilidad en celular. No se agregó lógica de monitoreo ni se habilitaron cobros, automatización o retención.

La prueba del shell verifica tanto la sección de monitoreo y los respaldos pendientes como la actualización desplegable del panel. Se mantienen las cabeceras privadas, el control de sesión/MFA y los estados de pago del código de main.

No se añadieron dependencias ni migraciones. La migración 0015 ya existente en main se aplicó únicamente a la base desechable local `127.0.0.1:55439/guteli_test` mediante las suites; no hubo acceso a datos reales ni cambios de infraestructura de producción.

## Verificación del resultado integrado

| Verificación | Resultado final | Evidencia |
| --- | --- | --- |
| Unitarias | 296 aprobadas, 2 fallos preexistentes de README | [Log](../../artifacts/admin-ux-2/integration/unit.txt) |
| Integración | 173 aprobadas en 25 archivos | [Log](../../artifacts/admin-ux-2/integration/integration.txt) |
| E2E general | 103 aprobadas, 10 variantes live omitidas y ejecutadas por separado | [Log](../../artifacts/admin-ux-2/integration/e2e.txt) |
| Admin UX | 1 recorrido aprobado, 30 capturas y 28 comprobaciones axe sin infracciones | [Log](../../artifacts/admin-ux-2/integration/ux.txt) |
| Checkout live | 10 aprobadas, 1 variante demo cubierta en la suite general | [Log](../../artifacts/admin-ux-2/integration/checkout-live.txt) |
| Contacto live / no disponible | 1 aprobada en cada modo | [Live](../../artifacts/admin-ux-2/integration/handoff-live.txt), [no disponible](../../artifacts/admin-ux-2/integration/handoff-unavailable.txt) |
| Privacidad y build de producción | Build y prueba de cabeceras aprobados, incluyendo `/api/admin/analytics?period=7` | [Log](../../artifacts/admin-ux-2/integration/privacy-build.txt) |
| Lint | Aprobado | [Log](../../artifacts/admin-ux-2/integration/lint.txt) |
| Typecheck | Aprobado | [Log](../../artifacts/admin-ux-2/integration/typecheck.txt) |

En total se aprobaron 117 escenarios de navegador entre las configuraciones. [Resultados consolidados](../../artifacts/admin-ux-2/integration/results.json).

La primera ejecución unitaria en paralelo produjo además dos timeouts de herramientas CLI; desaparecieron al repetir la suite completa con `npm test -- --maxWorkers=1 --minWorkers=1`, sin modificar código ni límites de tiempo. La primera ejecución de integración heredó `TRUSTED_PROXY_HOPS=1` del entorno de navegador y falló en dos solicitudes directas de `auth-config` sin cabecera proxy. Se repitió toda la suite quitando las variables de navegador `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `RATE_LIMIT_SECRET`, `RECEIPT_TOKEN_SECRET` y `TRUSTED_PROXY_HOPS`, conservando `DATABASE_URL` y `DATABASE_URL_TEST` en la base aislada: las 173 pruebas aprobaron. No se modificó la seguridad de autenticación. Se conservan ambos logs iniciales, identificados con el sufijo `-initial`, para trazabilidad.

Los dos fallos de documentación de `tests/unit/docker-runtime.test.ts` ya existían antes del merge y fueron informados antes de la autorización de integración. `README.md` y esa prueba conservan exactamente el contenido de main. La prueba de persistencia tras reiniciar un contenedor continúa excluida solo de la configuración local de Admin UX por ausencia del daemon Docker; permanece en la suite estándar. No se afirma que estas limitaciones estén resueltas.

Las cuentas, pedidos y promociones de los recorridos son ficticios. Las pruebas de WhatsApp inspeccionan enlaces o interceptan su apertura; no envían mensajes. Las comprobaciones de privacidad usan un build de producción con secretos ficticios y un servidor local.

## Evidencia visual

El dashboard integrado se volvió a capturar con Playwright y se revisó visualmente en [desktop, 1440 px](../../artifacts/admin-ux-2/integration/dashboard-1440.png) y [móvil, 390 px](../../artifacts/admin-ux-2/integration/dashboard-390.png). Incluye las siete tarjetas de Estado de la tienda. Los recorridos también comprueban desbordamiento a 320 y 768 px.

Se conserva un [manifiesto SHA-256](../../artifacts/admin-ux-2/integration/visual-manifest.json), los informes axe completos de ambos dashboards y el [resumen de las 28 comprobaciones](../../artifacts/admin-ux-2/integration/accessibility.json), todas sin infracciones detectadas. Esto no sustituye una auditoría manual completa de accesibilidad.

Las capturas y logs anteriores permanecen en [la entrega original](../../artifacts/admin-ux-2/README.md); representan la rama antes del merge. Los nuevos resultados de integración se almacenan por separado para no sustituir esa evidencia.

## Publicación

El merge se publica mediante avance normal de `origin/main`, sin force-push, rebase, deploy ni eliminación de ramas. El estado remoto se compara con el SHA del merge al terminar. El checkout original permanece en su revisión anterior para respetar el aislamiento solicitado.
