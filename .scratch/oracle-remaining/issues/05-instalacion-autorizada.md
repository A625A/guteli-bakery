# 05: Instalar el candidato independiente

**What to build / Qué entrega:** Güteli funciona como demo HTTPS en su propia VM sin afectar el hackathon ni habilitar operaciones comerciales.

**Blocked by / Bloqueado por:** 01 — discrepancias de release cerradas o excepción expresa;02 — ciclo Linux ARM64;03 — recursos;04 — contenido; autorización de instalación/publicación/versionado.

**Status / Estado:** PREPARACIÓN LOCAL COMPLETA (23/10/2026); INSTALACIÓN ORACLE BLOQUEADA Y NO AUTORIZADA. Fotografías completadas en el formulario reutilizando APIs existentes; ver informe para verificación.

**Criterios de aceptación:**

- [ ] Autorizar por separado commit/publicación y SHA final, creación de recursos, SSH/software/firewall, DB/migraciones, cuentas, DNS/TLS y publicación.
- [ ] Crear exclusivamente recursos independientes elegibles; verificar NSG/firewall, montaje/UUID y secretos nuevos sin registrar sus valores.
- [ ] Inicializar sólo base nueva, aplicar SQL revisado explícitamente y provisionar cuentas individuales con MFA; nunca usar seed de ejemplo como catálogo real.
- [ ] Instalar SHA que incluya Admin UX 2.0 y Ticket 12; validar HTTPS/canonización,403 comercial, catálogo/carrito, admin/MFA y bloqueo de puertos3000/5432.
- [ ] Registrar verificaciones reales como Oracle y conservar rollback; no activar timers/alertas ni comercio sin su autorización.

**Límites:** Sin acceso externo privilegiado, datos reales, gasto, commit/push/merge/deploy ni cambios a otros proyectos sin autorización específica. No repetir evidencia válida; registrar qué cambio justifica cada prueba nueva.

## Preparación autorizada — 23/10/2026

- [Secuencia exacta, requisitos y autorizaciones](../../../docs/operations/oracle/instalacion-ticket-05.md).
- [Informe del ticket y pruebas dirigidas](../../../artifacts/oracle-preparation/ticket-05/RESULTADO.md).
- Fotografías: botón «Agregar fotografía» antes de crear y al editar; vista previa, descarte/reemplazo/eliminación pendientes hasta guardar. Una fotografía activa por producto, como el sistema existente. Fallos conservan la selección y las fotos anteriores; datos y fotografía se guardan con APIs separadas y un mensaje explícito de resultado parcial.
- Dependencias 01/02 satisfechas localmente; 03/04 siguen pendientes. Bloqueo npm sin remediar. Los criterios externos originales permanecen abiertos hasta ejecución real autorizada.
- Sin commit/push/merge de Ticket 05, Oracle/SSH/OCI, despliegue, activación comercial/pagos/WhatsApp ni Ticket 06.

## Consolidación local autorizada — 23/10/2026

Fotografías/pruebas en `c4ef53274820e6f3205f092a651123c0493e0bd9`. Se autorizan commits locales del Ticket 05; push y merge siguen pendientes de aprobación posterior. Ver [reporte actualizado](../../../artifacts/oracle-preparation/ticket-05/RESULTADO.md). Los criterios de instalación y publicación permanecen abiertos; no se incorporan los cambios pendientes del Ticket 03.
