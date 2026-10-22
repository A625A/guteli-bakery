# Ticket 01 — cerrado localmente

18/10/2026, America/Guatemala. Rama `infra/oracle-always-free-preparation`, worktree `guteli-oracle-always-free`, HEAD/base `082959dafe57cf1ec5fdfed00a0aa71f99de64b4`. Sin commit/push/merge/deploy, Oracle, hackathon ni avance a Ticket 02.

## Correcciones

1. **README:** se restauró documentación útil del flujo Compose local: daemon/config, provisión explícita, migraciones/seed sólo en base ficticia, arranque/parada sin borrar volúmenes, secretos privados y dirección interna de PostgreSQL. Se identificaron sus credenciales/puertos de desarrollo, ausencia de inyección automática de secretos y límites de HTTP. Se enlazó la guía Oracle independiente sin recomendar el Compose raíz para producción. No se alteró `tests/unit/docker-runtime.test.ts`, ni se agregaron skips o excepciones.
2. **Capturas:** `captureMenu` espera el botón habilitado por la hidratación de CartProvider antes de que Playwright escriba estilos temporales. Se conserva la validación de consola, navegación, formulario, foco y overflow. `GUTELI_SCREENSHOT_ROOT` permite guardar nuevas capturas aparte de las históricas; el valor por defecto es el anterior.
3. **Regresión:** un caso nuevo retrasa los scripts del menú durante 750 ms y observa escrituras de caret sobre campos aún deshabilitados. Antes de corregir, detectó diez escrituras prematuras y falló; con la espera pasó. El retraso pertenece al escenario de prueba, no a la corrección. No se filtraron advertencias ni se añadió suppressHydrationWarning.

## Diagnóstico y límites del hallazgo

La ejecución móvil original aislada pasó (8.1 s); el aviso previo era intermitente. El registro histórico `../browser-regression.txt` mostraba exactamente `caret-color: transparent` durante hidratación. El código instalado de Playwright en `node_modules/playwright-core/lib/coreBundle.js`, función `inPagePrepareForScreenshots`, confirma esa escritura temporal. El caso controlado reprodujo el mecanismo (mutación antes de hidratar), no necesita provocar otra vez el mensaje React completo. La corrección elimina esa ventana esperando el estado interactivo observable. No se modificó lógica de aplicación.

## Verificación dirigida

| Evidencia | Resultado |
|---|---|
| `readme-contracts.txt` — `node node_modules/vitest/vitest.mjs run tests/unit/docker-runtime.test.ts` | 7/7; incluidos los dos contratos heredados sin modificar sus assertions |
| `mobile-repro.txt` — Playwright artifacts.spec, project storefront, grep captures the mobile | 1/1 antes de corregir; confirma intermitencia, no se usó como cierre |
| `hydration-red.txt` — mismo archivo, grep menu capture waits | Fallo esperado: diez inputs modificados antes de hidratar |
| `capture-green.txt` — mismo archivo completo, sólo project storefront | 3/3: desktop, mobile y caso controlado; 27.5 s total |
| `privacy.txt` — Playwright con playwright.privacy.config.ts | 1/1; 13.2 s incluyendo preparación/build; HTML privado, errores API y política de privacidad |
| `lint.txt` — ESLint sólo tests/browser/artifacts.spec.ts | Salida 0 |
| `preservation.txt` | Assertions, config privacidad, screenshots históricos y next-env idénticos al inicio |

Navegador con `DATABASE_URL_TEST=postgresql://guteli_test_operator@127.0.0.1:55439/guteli_test`; variables de proxy HTTP/HTTPS/ALL retiradas para conexión directa. El proyecto storefront habilita pedidos sólo para fixtures de regresión. Las nuevas capturas comerciales de prueba no representan la demo Oracle, cuyo bloqueo no cambió. Se revisó visualmente la captura móvil del menú y se conserva la aserción de ancho sin overflow.

La suite privacy existente ejecuta reset/migrate/seed en **guteli_test** y un build de producción, necesario porque Next dev modifica Cache-Control. Se reutilizaron las demás evidencias; no se ejecutaron suites completas unitarias, de integración ni de navegador. Los resultados históricos con fallos permanecen intactos y no se presentan retrospectivamente como aprobados.

## Entorno y preservación

El primer intento de reiniciar PostgreSQL omitió `-o` y trató de escuchar en 5432: falló al enlazar el puerto, sin conectar ni modificar el servicio existente. La primera invocación Playwright no llegó a ejecutar tests porque 55439 no estaba disponible (`mobile-before.txt`). Se corrigió usando explícitamente `-h 127.0.0.1 -p 55439 -k /private/tmp/guteli-oracle-validation.WyjKLo` sobre el PGDATA de esta tarea. No se alteró configuración global.

Al finalizar, se detuvo ese cluster con `pg_ctl ... stop -m fast`; directorios, bases de práctica/restauraciones y uploads se conservaron. Sólo la base sintética de suites se reinicializó con el harness existente. No hay cambios a las pruebas heredadas; las capturas nuevas están en `captures/` y `playwright-capture/`, con preimágenes en `original-screenshots/`. El manifiesto anterior permanece intacto; `manifest.json` de este ticket registra el snapshot posterior y su vínculo con el anterior.

## Riesgos que permanecen fuera de Ticket 01

No se ejecutó Docker/Compose/Caddy/Linux ARM64, ni instalación/actualización de contenedores, montajes reales o Oracle. Los comandos README se verificaron contra código y contratos, no mediante ejecución Docker. Esto corresponde al Ticket 02, que no se inició. Cuota, hostname, aceptación de propietarios y autorizaciones externas continúan abiertos. La validación es macOS ARM64/Node23.9/PostgreSQL17 y no sustituye el entorno objetivo. Ninguna aprobación comercial está implícita.
