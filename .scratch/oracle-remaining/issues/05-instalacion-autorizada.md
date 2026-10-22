# 05: Instalar el candidato independiente

**What to build / Qué entrega:** Güteli funciona como demo HTTPS en su propia VM sin afectar el hackathon ni habilitar operaciones comerciales.

**Blocked by / Bloqueado por:** 01 — discrepancias de release cerradas o excepción expresa;02 — ciclo Linux ARM64;03 — recursos;04 — contenido; autorización de instalación/publicación/versionado.

**Status / Estado:** BLOQUEADO / NO AUTORIZADO EN ESTA TAREA.

**Criterios de aceptación:**

- [ ] Autorizar por separado commit/publicación y SHA final, creación de recursos, SSH/software/firewall, DB/migraciones, cuentas, DNS/TLS y publicación.
- [ ] Crear exclusivamente recursos independientes elegibles; verificar NSG/firewall, montaje/UUID y secretos nuevos sin registrar sus valores.
- [ ] Inicializar sólo base nueva, aplicar SQL revisado explícitamente y provisionar cuentas individuales con MFA; nunca usar seed de ejemplo como catálogo real.
- [ ] Instalar SHA que incluya Admin UX 2.0 y Ticket 12; validar HTTPS/canonización,403 comercial, catálogo/carrito, admin/MFA y bloqueo de puertos3000/5432.
- [ ] Registrar verificaciones reales como Oracle y conservar rollback; no activar timers/alertas ni comercio sin su autorización.

**Límites:** Sin acceso externo privilegiado, datos reales, gasto, commit/push/merge/deploy ni cambios a otros proyectos sin autorización específica. No repetir evidencia válida; registrar qué cambio justifica cada prueba nueva.
