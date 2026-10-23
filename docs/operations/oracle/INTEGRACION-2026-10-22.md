# Integración Oracle + Admin UX 2.0 + Ticket 12

22/10/2026, America/Guatemala. Integración local validada; sin despliegue ni activación comercial.

## Historial y alcance

- Rama nueva: `main-integracion-oracle-admin-ux-20261022`.
- Worktree: `/Users/andrewarana/Projects/Guteli Bakery/.worktrees/integracion-oracle-admin-ux-20261022`.
- Base `origin/main` verificada con fetch: `082959dafe57cf1ec5fdfed00a0aa71f99de64b4`.
- `main` local conserva `4845ecfd693eca20a8d5628cfb6796e87acefe9f` (Ticket 12), dos commits detrás del remoto, y `products/` sin seguimiento. Stash previo y worktrees existentes conservados; los dos worktrees Desktop marcados prunable no se limpiaron.
- Admin UX 2.0 `18703b1e711507753b1f45aa5c0cf57414ecd250` y Ticket 12 son ancestros de la base y de Oracle. No se reaplicaron ni se duplicaron.
- Oracle incorporado: `6eb72daed77589049828aa3338469ebcbbcea3f6`, incluidos `9477d74c8081d3163b1f789e1bf8b5e1c13e67ee` y `667b927e884c29aaad15a906219d88da9084246c`.
- Merge descriptivo: `db6c7e38d760b694e36f2b97482cacb36bc875c6`. **Cero conflictos.** Su árbol es idéntico al de Oracle. El siguiente commit cambia únicamente este informe y el checkpoint.
- Administrador, componentes admin, DAL admin/auth, privacidad, pruebas admin-shell y package.json/package-lock.json idénticos a la base. Se conserva el diseño, MFA, permisos y Estado de la tienda; los guards Oracle se agregan antes del procesamiento de las APIs públicas y mantienen modo demo cerrado.
- Un solo agente. Sin cambios en hackathon, Oracle, main ni ramas fuente. Publicación autorizada exclusivamente a la rama nueva, sin force push.

## Validación nueva

Entorno local macOS ARM64, Node v23.9.0, npm 10.9.2; dependencias locales copiadas sin actualización. PostgreSQL 17 en un cluster nuevo exclusivo (`127.0.0.1:55443/guteli_test`), datos ficticios, sin acceso a bases existentes. Los flags de los fixtures que prueban contratos comerciales sólo aplican al proceso de pruebas; la app demo mantiene comercio, pagos y WhatsApp desactivados.

| Validación | Resultado |
| --- | --- |
| Vitest unitarias dirigidas (15 archivos) | 152/152 |
| Python `unittest discover -s tests/oracle -p test_ops.py` | 8/8 |
| Integración dirigida (5 archivos) | 32/32 |
| Playwright `--config playwright.oracle-demo.config.ts` | 3/3: móvil 390px, desktop 1440px, APIs demo y administración protegida |
| `npm run lint` | Aprobado, cero warnings ESLint |
| `npm run typecheck` | Aprobado |
| `npm run build` con variables ficticias del Dockerfile Oracle y demo cerrado | Aprobado |
| `git diff --check` | Aprobado |

Unitarias: commercial-demo, oracle-infrastructure, oracle-readiness, admin-security, admin-authorization-policy, admin-auth-route-policy, admin-page-access, privacy-cli, privacy-observability, privacy-failures, order-api, order-contract, whatsapp-automation-provider, whatsapp-provider y docker-runtime.

Integración: admin-authorization, admin-boundary-matrix, order-api, privacy-retention y checkout-session. Incluye matriz real de sesiones/permisos, métricas agregadas del dashboard, contrato REST, rollback y retención protegida.

Incidencias de entorno resueltas sin cambios de código: el primer build carecía de DATABASE_URL/configuración de importación; se repitió con valores ficticios documentados. El sandbox negó memoria compartida de PostgreSQL y conexión loopback (EPERM); se ejecutaron la preparación y las cinco suites con el permiso de ejecución requerido. El primer intento de 32 pruebas falló por conexión; el segundo aprobó 32/32. No se repitieron suites completas. Aviso NO_COLOR/FORCE_COLOR del navegador sin impacto.

## Evidencia reutilizada y publicación

- 72 archivos versionados coinciden con los manifiestos Oracle aplicados cronológicamente (preparación, Ticket 01, Ticket 02), antes de editar documentación de integración. La actualización del checkpoint es deliberada y no reescribe esos manifiestos históricos.
- Evidencia Admin UX existente: `artifacts/admin-ux-2/integration/results.json` (173 integración, 103 E2E y 10 omitidos, 28 informes axe sin violaciones); se conserva como evidencia histórica, no como ejecución nueva. El administrador permanece idéntico.
- Ticket 02 documenta Linux ARM64/Docker/Node22 y recuperación local; no se reinició Docker ni se repitieron esas auditorías. Ver `artifacts/oracle-preparation/ticket-02/RESULTADO.md` y `evidence.json`.
- Revisión acotada del historial entrante: 4 commits, 84 versiones únicas de archivos, cero coincidencias de secretos de alta confianza o paths sensibles; revisión de ejemplos de configuración con placeholders. No equivale a una auditoría integral de seguridad.
- Staging limitado a este informe y CHECKPOINT; ningún .env real, secreto, dump, respaldo, captura nueva, log crudo ni products/ se incorpora. Las capturas nuevas y logs permanecen fuera de Git.
- Logs locales: `/private/tmp/guteli-integration-20261022-evidence/`. Cluster sintético conservado en `/private/tmp/guteli-integration-pg.hIbwp2/data`; detenido al finalizar. Los hashes siguientes permiten verificar los logs locales; no los hacen disponibles en otro equipo.

| Log local | SHA-256 |
| --- | --- |
| `unit.log` | `43e6ea1a6ef3c2efeb8f63b6e4146cd3fa0fd616e5decbc7a48022e09842a3c1` |
| `ops.log` | `ff64c99714e379273fbe20fe0ee505ce2c4732baa5eb53653cac9001878d2faf` |
| `lint.log` | `4718a43b1fac0f443deb6e6349f1d75d789bc3cc7040f0a5220d773a31b7081f` |
| `typecheck.log` | `cbd6f59f41431e9049dc733a71a0ba59fe0d92cc423d1127e64101d7056825d7` |
| `build-configured.log` | `b769608e70038369d687c4562999e2964257ecb3207800d01560fcc620d16486` |
| `integration-local.log` | `ca349b746ae24f7ab8a4185db2a7edfa4965a7170ef437575a8b911badf599a3` |
| `demo-browser.log` | `cf99211549639461e3708afc875e0a2f4a2a184fc77e2d1a9a7e82cf309adf9c` |
| `hygiene.json` | `07c87bdd9f7de2acbd78eed7b91b4ce232120e3dea172889bc388bc054a72c5f` |

## Antes de incorporar a main

1. Revisar el diff consolidado y autorizar el merge a `main`; la integración técnica no tiene conflictos pendientes.
2. Confirmar que `origin/main` conserva la base indicada; si avanzó, integrar sólo el delta y repetir las comprobaciones afectadas.
3. Tener presente el reporte histórico de `npm ci` de Ticket 02: 23 vulnerabilidades (6 moderadas, 14 altas, 3 críticas), sin triage en aquel ticket ni auditoría nueva aquí. Dependencias sin cambios; su revisión sigue pendiente antes de aprobar producción.

Los tickets Oracle 03–06 siguen pendientes (cuota/hostname, aceptación, instalación autorizada y operación/recuperación real). Son pasos de despliegue, no conflictos de Git. El merge a main no autoriza Oracle, pagos, pedidos comerciales ni WhatsApp.
