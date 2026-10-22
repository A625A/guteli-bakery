# 02: Probar ciclo completo de despliegue en Linux ARM64

**What to build / Qué entrega:** El candidato se construye, arranca y conserva datos ficticios al actualizar o recuperarse, con la configuración exacta propuesta.

**Blocked by / Bloqueado por:** Docker/Compose y un entorno Linux ARM64 aislado disponibles y autorizados. No depende de 01 para comenzar.

**Status / Estado:** CERRADO LOCALMENTE el 21/10/2026 en Docker/Linux ARM64 virtualizado (Colima sobre Apple Silicon). No validado en Oracle.

**Criterios de aceptación:**

- [x] Resolver y fijar digests de Node 22/Postgres 17/Caddy 2; verificar arquitectura y dependencias nativas con npm ci y build real.
- [x] Validar Compose y Caddy; comprobar redirección al 443 externo, headers sobrescritos, app/DB sin puertos públicos y UID/permisos de secretos.
- [x] Demostrar rechazo ante montaje ausente/UUID incorrecto/PG_VERSION ausente; demostrar persistencia de catálogo e imágenes tras reinicios.
- [x] Ejecutar instalación nueva, rechazo de install sobre app existente, update con backup, esquema incompatible, falla de backup y recuperación manual sin migración implícita.
- [x] Ejecutar backup/restore Docker con cifrado, imágenes y trabajos pendientes, y confirmar que weekly-backup no levanta app detenida. Registrar resultados y tiempos sin afirmar Oracle.

**Resultado:** [Informe](../../../artifacts/oracle-preparation/ticket-02/RESULTADO.md), [evidencia](../../../artifacts/oracle-preparation/ticket-02/evidence.json) y [checkpoint](../../../docs/operations/oracle/CHECKPOINT.md). Los cinco criterios se verificaron localmente; la configuración de producción se validó por separado y el arranque usó nombres aislados, puertos loopback y CA interna. El update reaplicó el mismo candidato; no se simuló una nueva versión de aplicación.

**Límites:** Sin Oracle, datos reales, gasto, despliegue público, mensajes ni modificaciones a otros proyectos. Autorización expresa de esta sesión: tres checkpoints de Git exclusivamente a `origin/infra/oracle-always-free-preparation`; sin force push/merge/main. No se instaló software anfitrión ni se cambió el contexto Docker activo. No repetir evidencia válida. Ticket 03 no iniciado.
