# Trabajo restante — preparación Oracle Güteli

18/10/2026, America/Guatemala. División con `to-tickets`, **sólo Markdown local**, sin publicación ni modificación de tickets anteriores. El usuario autorizó dejar tickets locales; esta propuesta no autoriza sus acciones externas. No se requiere instalar un tracker ni detener el cierre para confirmar cada archivo.

La preparación principal y su matriz están terminadas. No se troceó artificialmente trabajo ya ejecutado. Un único implementador continuará sobre la frontera que esté autorizada; no utilizar subagentes por ticket ni repetir investigación/suites completas. Para tickets con infraestructura externa, confirmar autorización y entorno antes de actuar.

| Ticket | Bloqueado por | Entrega verificable |
|---|---|---|
|[01 — Cerrar discrepancias locales de regresión](issues/01-regresion-local.md)|Cerrado localmente el 18/10/2026|README 7/7, capturas 3/3, privacidad 1/1; evidencia conservada.|
|[02 — Probar el ciclo completo en Linux ARM64](issues/02-linux-arm64.md)|Docker/Compose disponibles en entorno aislado aprobado|Build, proxy, persistencia, mounts, backup/update/restore reales con datos ficticios.|
|[03 — Confirmar recursos gratuitos y hostname](issues/03-cuota-hostname.md)|Acceso manual a cuenta autorizado|Inventario no sensible y decisión demostrable sobre VM independiente Q0.|
|[04 — Aprobar catálogo y operación de la demo](issues/04-aceptacion-demo.md)|Participación de dueños|Contenido comercial aprobado, cuentas/roles y práctica/limpieza aceptados.|
|[05 — Instalar el candidato independiente](issues/05-instalacion-autorizada.md)|01,02,03,04 y autorización explícita|VM separada con demo HTTPS y OWNER/ADMIN/MFA, sin comercio activo.|
|[06 — Demostrar recuperación y alertas en Oracle](issues/06-operacion-oracle.md)|05 y autorización de programación/correos|Backup/restore/reboot/rollback y alertas demostrados; aceptación operativa demo.|

01 quedó cerrado con evidencia local; no requiere waiver. Esto satisface únicamente esa dependencia de 05, no habilita instalación ni inicia 02. 02/03/04 pueden avanzar conceptualmente en paralelo; **no se recomienda delegación automática**: un solo ejecutor reduce releer contexto y duplicar pruebas. Comercialización/pagos no son un séptimo ticket implícito: requieren un alcance y decisión futura propios.

Para reanudar, leer únicamente el checkpoint y el ticket elegido, luego los archivos que éste requiera. No volver a empezar la auditoría ni a consultar las mismas fuentes salvo cambio de fecha/condiciones pertinente.
