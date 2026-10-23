# Trabajo restante — preparación Oracle Güteli

23/10/2026, America/Guatemala. División con `to-tickets`, **sólo Markdown local**, sin publicación ni modificación de tickets anteriores. El usuario autorizó dejar tickets locales; esta propuesta no autoriza sus acciones externas. No se requiere instalar un tracker ni detener el cierre para confirmar cada archivo.

La preparación principal y su matriz están terminadas. No se troceó artificialmente trabajo ya ejecutado. Un único implementador continuará sobre la frontera que esté autorizada; no utilizar subagentes por ticket ni repetir investigación/suites completas. Para tickets con infraestructura externa, confirmar autorización y entorno antes de actuar.

| Ticket | Bloqueado por | Entrega verificable |
|---|---|---|
|[01 — Cerrar discrepancias locales de regresión](issues/01-regresion-local.md)|Cerrado localmente el 18/10/2026|README 7/7, capturas 3/3, privacidad 1/1; evidencia conservada.|
|[02 — Probar el ciclo completo en Linux ARM64](issues/02-linux-arm64.md)|Cerrado localmente el 21/10/2026|Docker/Linux ARM64 virtualizado: build, proxy, persistencia, mounts, backup/update/restore ficticios verificados.|
|[03 — Confirmar recursos gratuitos y hostname](issues/03-cuota-hostname.md)|Acceso manual a cuenta autorizado|Inventario no sensible y decisión demostrable sobre VM independiente Q0.|
|[04 — Aprobar catálogo y operación de la demo](issues/04-aceptacion-demo.md)|Revisión de dueños y recuperación de entorno para ensayo interactivo|Ficha y evidencia preparadas; referencias PRUEBA corregidas. Aceptación comercial pendiente.|
|[05 — Instalar el candidato independiente](issues/05-instalacion-autorizada.md)|01,02,03,04 y autorización explícita|VM separada con demo HTTPS y OWNER/ADMIN/MFA, sin comercio activo.|
|[06 — Demostrar recuperación y alertas en Oracle](issues/06-operacion-oracle.md)|05 y autorización de programación/correos|Backup/restore/reboot/rollback y alertas demostrados; aceptación operativa demo.|

01 y 02 quedaron cerrados con evidencia local; no requieren waiver. Esto satisface únicamente esas dependencias de 05, no habilita instalación. 03 permanece pendiente; 04 preparado sobre evidencia, con aceptación comercial pendiente y ensayo interactivo bloqueado; **no se recomienda delegación automática**: un solo ejecutor reduce releer contexto y duplicar pruebas. Comercialización/pagos no son un séptimo ticket implícito: requieren un alcance y decisión futura propios.

Para reanudar, leer únicamente el checkpoint y el ticket elegido, luego los archivos que éste requiera. No volver a empezar la auditoría ni a consultar las mismas fuentes salvo cambio de fecha/condiciones pertinente.

La autorización posterior de Git permitió publicar la preparación y Ticket 02 sólo en `infra/oracle-always-free-preparation`. No altera los límites de los tickets externos. Ver el checkpoint vigente.

Ticket 04: [ficha](../../docs/operations/oracle/aceptacion-duenos.md) y [reporte](../../artifacts/oracle-preparation/ticket-04/RESULTADO.md). Merge local autorizado el 23/10; publicación bloqueada por 23 vulnerabilidades npm. Cambios pendientes del Ticket 03 conservados localmente fuera de este commit. Sin push/deploy ni avance a 05/06.
