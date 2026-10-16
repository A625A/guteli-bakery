# Ticket 12 — Privacidad, protección de datos y monitoreo

Fecha: 15 de octubre de 2026. Estado: mejoras locales implementadas; comprobaciones y decisiones pendientes de producción indicadas abajo. **No autoriza publicación ni eliminación de datos reales.**

Actualización del 16 de octubre: el usuario autorizó explícitamente el commit y push a GitHub de este alcance. Se incorporó mediante fast-forward el cambio de README `77753bae93d6706fa59f0251a5a1334640aef740` antes de preparar la publicación. Esta autorización no activa despliegues, limpieza, pagos, mensajes ni servicios externos. El informe siguiente conserva la evidencia y los límites de la implementación local del día 15.

## Base revisada y alcance

Repositorio `A625A/guteli-bakery`, rama `main`, base local y remota comprobada mediante `git ls-remote`: `2a73ab5da0edef60af1eabb8a2693f6252b7dd80`. Se revisaron el Ticket 12 en `.scratch/production-readiness/issues/12-privacy-and-observability.md`, el plan de integraciones de agosto, el código vigente de autenticación/MFA, pedidos, recibos, almacenamiento y WhatsApp, y los cambios publicados hasta esa base, incluido el Ticket 13 de experiencia de la dueña y métodos de pago. Comprobar el código publicado no implica comprobar una instalación desplegada.

La autorización de esta conversación sustituye el estado antiguo «draft — not authorized» del borrador para mejoras locales no destructivas. Los plazos de 180 días para datos personales y 365 días para auditoría del plan anterior no eran decisiones aprobadas. El historial de pedidos se conserva; la anonimización requiere revisión y aprobación aparte.

## 1. Riesgos detectados

| Riesgo                                                                                        | Resultado local / límite pendiente                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| URLs de recibos y diagnósticos de autenticación podían terminar en logs automáticos           | Desactivado el logging automático de Next en desarrollo; logger de autenticación y errores controlados usan códigos fijos. Se probó una excepción con datos canario sin fuga.                                                                                                              |
| Rutas privadas no compartían una política completa de caché, indexación y referer             | Encabezados extendidos a pedidos, carrito, checkout, autenticación y administración; verificación HTTP real en navegador local.                                                                                                                                                            |
| El worker eliminaba callbacks de WhatsApp tras siete días, incluso al terminar un lote normal | Eliminación retirada; `--cleanup` rechaza la operación. No se descarta evidencia de conciliación por un plazo no aprobado.                                                                                                                                                                 |
| La dueña no tenía un estado operativo integrado                                               | Se añadió al panel existente información agregada, sin clientes, secretos ni errores del proveedor.                                                                                                                                                                                        |
| Contadores volátiles y observador dentro del mismo servicio                                   | Los contadores se pierden al reiniciar y no agregan réplicas. Si cae toda la aplicación o la base, el panel puede quedar inaccesible. No hay aviso externo.                                                                                                                                |
| Tokens privados de recibo sin vencimiento                                                     | Son credenciales portadoras: quien posee un enlace puede ver el recibo limitado. Una referencia pública no da acceso al resumen personal. Falta decidir revocación/caducidad sin romper recuperación.                                                                                      |
| Logs fuera del control de la aplicación                                                       | Sigue pendiente comprobar Next, Node, PostgreSQL, proxy y adaptadores. El adaptador de Better Auth contiene un `console.error` interno en su mecanismo de joins alternativo. El callback seguro no intercepta ese camino. No se afirma ausencia total de fugas en cualquier falla interna. |
| Almacenamiento y respaldos                                                                    | La comprobación local verifica permisos de acceso; no mide espacio ni demuestra durabilidad/restauración. Respaldos pendientes del Ticket 11.                                                                                                                                              |
| Conservación legal y copias secundarias                                                       | No existe todavía clasificación jurídica por pedido ni inventario completo de consentimientos, mensajes y respaldos para una anonimización integral. La política destructiva permanece desactivada.                                                                                        |

No se encontró en las pruebas ejecutadas un acceso al resumen personal de otro pedido mediante credencial ausente, alterada, ajena o vencida. Esto describe la cobertura verificada, no una garantía frente a cualquier ataque.

## 2. Mejoras implementadas

- Logger con vocabulario cerrado y fecha propia; descarta errores, argumentos, IDs, URLs, cookies y objetos. Contadores acotados en memoria; un fallo del logger no interrumpe la operación.
- Límite HTTP de autenticación que transforma fallas inesperadas en respuesta genérica en español. Se mantiene la respuesta genérica para correo/contraseña incorrectos, así como sesión, roles, cambio inicial de contraseña y MFA.
- `private, no-store`, `no-referrer` y `noindex, nofollow` en superficies privadas. Se conserva la CSP existente. Los endpoints que ya usaban `no-store` mantienen ese contrato; la directiva impide almacenamiento incluso sin la palabra `private`.
- Página `/privacidad/` enlazada desde el pie existente y procedimiento documental para solicitudes de acceso/corrección/eliminación. El texto comercial queda pendiente de aprobación antes de publicar.
- Pantalla genérica de error en español; códigos seguros para fallas de pedidos, base y autenticación. Sin serializar excepciones en respuestas o eventos propios.
- Sección **Estado de la tienda** en el panel actual, con autorización administrativa y MFA antes de consultar datos operativos.
- Migración aditiva `0015_operational_checks.sql`: una fila máxima de señal del worker, sin datos personales, con valores restringidos. No se migró ninguna base real.
- Planificador puro de conservación y CLI de simulación con lectura de metadatos, máximo 100 filas y salida agregada. No hay `--apply`, cron ni variable para activar borrado productivo.

## 3. Conservación pendiente de aprobación

La propuesta completa y sus fuentes están en [Privacidad y conservación](../operations/privacidad-conservacion.md). Se investigaron Constitución, Código de Comercio, Código Tributario y alcance de la LAIP; se distinguió la iniciativa de datos personales de una ley promulgada. Algunas fuentes oficiales solo pudieron contrastarse mediante sus extractos indexados; no se certifica una compilación exhaustiva de reformas.

El mínimo mercantil de cinco años y las obligaciones tributarias impiden adoptar automáticamente el plazo anterior de 180 días. Propuesta: conservar historial e importes; revisar identidad del pedido después de cinco años desde el cierre, extendiendo por evidencia fiscal, conciliación, disputas o requerimientos. El mínimo mercantil no es permiso automático para borrar. [Código de Comercio, artículos 382–383](https://jurisprudencia.oj.gob.gt/Expediente/frmContenido.aspx?BUSCAR1=&MARCADOR=&NOTAID=&OPCION=2&PARAMETRO=87523), [conservación tributaria, Decreto 20-2006](https://www.minfin.gob.gt/images/archivos/leyes/tesoreria/Decretos/DECRETO%20DEL%20CONGRESO%2020-2006.pdf).

Se proponen 90 días para copias operativas prescindibles y 30 días para logs técnicos sin datos personales o copias de notificaciones definitivamente conciliadas. Auditoría/evidencia financiera: al menos cinco años o el plazo superior aplicable. Idempotencia y supresiones se mantienen mientras eviten duplicados. **Ninguno de estos plazos fue activado.**

La simulación bloquea pedidos activos, recientes, pagados o con situación financiera/legal/notificaciones desconocida. El código usa 1827 días únicamente como piso conservador de prueba. Las modificaciones de anonimización se ejecutaron exclusivamente en fixtures aislados; pedidos pagados, importes, líneas, auditoría, idempotencia y supresiones se comprobaron preservados. Falta una implementación productiva que abarque todas las copias y las retenciones legales explícitas.

## 4. Monitoreo y limitaciones

| Área                        | Evidencia preparada                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guardado inicial de pedidos | Evento seguro y contador local de errores; ausencia de errores se muestra como «Sin comprobar».                                                                       |
| Base de datos               | Consulta limitada por tiempo y `/health` sin caché. El acceso al panel depende también de la base.                                                                    |
| WhatsApp                    | Agregados de fallas, resultados desconocidos, envíos con plazo agotado y pendientes antiguos, para cliente y dueña. Sin reenviar automáticamente resultados ambiguos. |
| Worker                      | Señal persistida al terminar/fallar, protegida contra observaciones antiguas; más de diez minutos sin ejecución confirmada requiere revisión cuando está habilitado.  |
| Archivos                    | Acceso a carpeta existente, sin escribir ni crear archivos durante la comprobación.                                                                                   |
| Pagos                       | Desactivado, pendiente de proveedor/verificación. No se confirman cobros con este panel.                                                                              |
| Respaldos                   | «Sin comprobar», pendiente del Ticket 11. No se creó ni inició ese ticket.                                                                                            |

No se agregó ninguna plataforma, dependencia de pago, monitor externo, suscripción o destinatario. No se activó un scheduler. El panel no avisa cuando está cerrado. Los detalles para soporte están en [Monitoreo local](../operations/monitoreo-local.md).

## 5. Pruebas

Entorno: PostgreSQL 17 aislado en `127.0.0.1:55436`, base `guteli_test`, únicamente datos ficticios; archivos temporales de pruebas. Suites que reinician la base ejecutadas de forma secuencial. Al terminar se detuvo exclusivamente ese servidor, conservando sus archivos. Los servidores web de pruebas fueron cerrados por Playwright.

| Comprobación                                                                                        | Resultado                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test -- --maxWorkers=1`, última ejecución                                                      | **292 pasaron, 2 fallaron**, 294 pruebas / 43 archivos. Las dos fallas son documentales en `docker-runtime.test.ts`; README y ese test permanecen idénticos a la base publicada.                                                                     |
| Nuevas suites unitarias de privacidad, CLI, conservación y estados                                  | **29 pasaron**, incluidas en el total anterior. Canarios, errores, acceso a archivos, bloqueos financieros/legales, worker sin señal y rechazo de comandos destructivos.                                                                             |
| `npm run test:integration`                                                                          | **171 pasaron**, 24 archivos. Incluye aislamiento entre pedidos, credenciales falsificadas/vencidas, sesiones, permisos, MFA y precios pagados inmutables.                                                                                           |
| Revalidación de autenticación/autorización tras el último ajuste del agregado operativo             | **10 pasaron**. Incluye aviso por reintentos de WhatsApp agotados y DTO sin destinatarios ni identificadores privados.                                                                                                                               |
| Integración de conservación y señal del worker, tras reforzar el resguardo de fixtures              | **2 pasaron**. Simulación sin cambios, anonimización repetible, preservación exacta de líneas financieras, auditoría, idempotencia, supresiones y pedido pagado.                                                                                     |
| `npm run test:privacy`, build standalone local                                                      | **1 pasó**. HTML privado y errores API con `no-store`, `no-referrer`, `noindex`; aviso de privacidad visible.                                                                                                                                        |
| Navegador, corrida global en modo demostración                                                      | **91 pasaron, 2 fallaron, 10 omitidas por modo, 11 no ejecutadas por dependencia fallida**. Las fallas fueron Docker no disponible y un selector de promoción intermitente. Se completaron los grupos pendientes por separado, como se indica abajo. |
| Panel administrativo con `--project=admin --no-deps`                                                | **11 pasaron**, incluido el nuevo estado de tienda, login, cambio de contraseña, MFA, roles, catálogo y pedidos.                                                                                                                                     |
| Resumen privado con apertura/copia de WhatsApp simuladas                                            | **10 pasaron, 1 omitida por ser exclusiva del modo demo**. Esa variante demo sí pasó en la corrida global. No hubo mensajes reales.                                                                                                                  |
| Enlace configurado y destino no autorizado, suites locales `test:e2e:live` / `test:e2e:unavailable` | **1 + 1 pasaron**. Son pruebas locales de enlaces, no activación de servicios externos.                                                                                                                                                              |
| Repetición aislada de la promoción                                                                  | **1 pasó**. La falla intermitente anterior sigue registrada; no se corrigió ni modificó ese test.                                                                                                                                                    |
| `npm run privacy:check`                                                                             | Salida agregada con `executionEnabled:false`, sin escritura. En la última base de fixtures ya reiniciada había cero pedidos; los casos con datos se verificaron en integración.                                                                      |
| `npm run typecheck`                                                                                 | **Pasó** en la versión final.                                                                                                                                                                                                                        |
| `npm run lint`                                                                                      | **Pasó**, cero warnings en la versión final.                                                                                                                                                                                                         |
| `npm run build`                                                                                     | **Pasó** en la versión final.                                                                                                                                                                                                                        |
| Formato de archivos del alcance / `git diff --check`                                                | **Pasaron**.                                                                                                                                                                                                                                         |

Los conteos de revalidaciones se solapan: no deben sumarse como pruebas únicas. Las pruebas de seguridad forman parte de las suites unitarias, integración y navegador, no de una certificación o pentest externo. El escaneo de las salidas finales de privacidad, autenticación, panel y resumen no encontró los marcadores `CANARY_`; esto no prueba todos los logs posibles del runtime.

**Fallas conservadas y límites de evidencia:**

- `tests/unit/docker-runtime.test.ts`: falta en README el comando literal `docker compose up --build -d` y la instrucción `docker compose --profile provision run --rm provision`. No se reescribió documentación ajena para esconderlas.
- `tests/browser/order-persistence.spec.ts`: Docker no pudo conectarse a `/var/run/docker.sock`. No se inició ni reconfiguró Docker; la prueba de persistencia tras reinicio de contenedor queda pendiente. Las pruebas de base de datos se ejecutaron con PostgreSQL local aislado.
- `tests/browser/order-journey.spec.ts`: una corrida de promoción falló porque `Total: Q150` coincidió con dos elementos, uno oculto; otra corrida y la repetición aislada pasaron. Falta aislar esa intermitencia; no se considera una regresión global completamente verde.
- La primera comprobación estricta del HTML falló contra `next dev`: esta versión reemplaza el encabezado por `no-cache, must-revalidate`. Se verificó el comportamiento requerido con un servidor **standalone de producción en localhost**, sin relajar la aserción a aceptar caché.
- Hubo intentos corregidos por configuración de prueba: proxy confiable sin cabecera reenviada en integración, modo demo incompatible con los casos de apertura simulada, puertos locales bloqueados por sandbox y una carrera de ESLint con el directorio temporal de Playwright. Las ejecuciones finales correspondientes se repitieron con configuración adecuada; no se debilitó autenticación ni MFA.

Evidencia de comandos y salidas: `/private/tmp/guteli-ticket12-harness/` (`unit.log`, `integration.log`, `auth-integration.log`, `privacy-integration.log`, `privacy-browser.log`, `browser.log`, `browser-available.log`, `browser-admin.log`, `browser-summary.log`, `browser-promotion.log`, `handoff-live.log`, `handoff-unavailable.log`, `types.log`, `lint.log`, `build.log`). Son archivos temporales locales, no publicados.

Para reproducir se necesita una **base aislada y descartable llamada `guteli_test`**, `DATABASE_URL_TEST` y las variables de prueba. Integración y Playwright reinician su esquema; nunca apuntarlos a datos reales. Usar `GUTELI_SUMMARY_DEMO=true` en la suite demo y ejecutar los diez casos del resumen por separado con modo de tienda, apertura simulada y automatización desactivada. `test:privacy` incluye build y arranque standalone; no despliega.

## 6. Archivos modificados

Inventario del alcance: 46 archivos nuevos o modificados. `products/` y worktrees ajenos permanecen fuera del alcance. Las nueve capturas generadas por las pruebas se restauraron a sus bytes anteriores; `next-env.d.ts` terminó idéntico a la base después del build. No forman parte de la entrega.

- `docs/audits/2026-10-15-ticket12-privacidad-monitoreo.md`
- `docs/operations/guia-del-dueno.md`
- `docs/operations/monitoreo-local.md`
- `docs/operations/privacidad-conservacion.md`
- `docs/operations/ticket12-plan-local.md`
- `docs/operations/whatsapp-automation.md`
- `drizzle/0015_operational_checks.sql`
- `drizzle/meta/0015_snapshot.json`
- `drizzle/meta/_journal.json`
- `next.config.ts`
- `package.json`
- `playwright.privacy.config.ts`
- `scripts/privacy-check.ts`
- `scripts/seed.ts`
- `scripts/start-privacy-test.mjs`
- `scripts/whatsapp-worker.ts`
- `src/app/(storefront)/privacidad/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/api/order-status/[receiptToken]/route.ts`
- `src/app/api/orders/route.ts`
- `src/app/error.tsx`
- `src/app/health/route.ts`
- `src/components/shared/SiteFooter.tsx`
- `src/instrumentation.ts`
- `src/proxy.ts`
- `src/server/auth/auth.ts`
- `src/server/db/schema/operations.ts`
- `src/server/http/error-response.ts`
- `src/server/observability/safe-log.ts`
- `src/server/operations/status.ts`
- `src/server/operations/summary.ts`
- `src/server/operations/worker-signal.ts`
- `src/server/privacy/headers.ts`
- `src/server/privacy/retention.ts`
- `tests/browser/admin-shell.spec.ts`
- `tests/integration/admin-authorization.test.ts`
- `tests/integration/auth-config.test.ts`
- `tests/integration/privacy-retention.test.ts`
- `tests/privacy/headers.spec.ts`
- `tests/unit/operations-status.test.ts`
- `tests/unit/privacy-cli.test.ts`
- `tests/unit/privacy-failures.test.ts`
- `tests/unit/privacy-observability.test.ts`
- `tests/unit/retention.test.ts`
- `tests/unit/whatsapp-automation-provider.test.ts`

## 7. Pendientes para producción

1. Revisión contable/legal de régimen, documentos, plazos, cómputo, retenciones y texto público; aprobación específica antes de cualquier cambio de datos reales.
2. Diseñar revocación/recuperación de recibos e inventariar copias antes de activar anonimización integral.
3. Cerrar los riesgos residuales de logs del framework/adaptador y configurar logs/cachés del host/proxy; verificar encabezados sobre el dominio real cuando se autorice acceso.
4. Aprobar publicación y aplicar la migración aditiva en el entorno elegido. Sin tabla, la observación del worker no está disponible.
5. Autorizar por separado un monitor gratuito fuera de la aplicación y un canal de aviso, si se necesita notificación con el panel cerrado.
6. Verificar almacenamiento durable, espacio y respaldos/restauración cuando corresponda al Ticket 11; integrar verificación de pagos solo cuando exista una funcionalidad autorizada.
7. Resolver las fallas documentales de pruebas existentes antes de considerar la regresión completamente verde.

No se accedió a Oracle ni al hackathon, no hubo despliegue, commit, push, mensajes reales, cobros, servicios pagos ni modificación de datos reales. Los ensayos y la migración se limitaron al entorno ficticio.

## 8. Siguiente paso recomendado

Revisar este diff local y la propuesta de conservación con la dueña y su asesor contable/legal. Después, acordar dentro del Ticket 12 los plazos, excepciones y controles residuales de logs; solicitar autorización explícita para cualquier publicación o ejecución sobre datos reales. No iniciar otro ticket automáticamente.
