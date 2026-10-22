# 02: Probar ciclo completo de despliegue en Linux ARM64

**What to build / Qué entrega:** El candidato se construye, arranca y conserva datos ficticios al actualizar o recuperarse, con la configuración exacta propuesta.

**Blocked by / Bloqueado por:** Docker/Compose y un entorno Linux ARM64 aislado disponibles y autorizados. No depende de 01 para comenzar.

**Status / Estado:** BLOQUEADO POR ENTORNO; no instalar herramientas sin autorización aplicable.

**Criterios de aceptación:**

- [ ] Resolver y fijar digests de Node 22/Postgres 17/Caddy 2; verificar arquitectura y dependencias nativas con npm ci y build real.
- [ ] Validar Compose y Caddy; comprobar redirección al 443 externo, headers sobrescritos, app/DB sin puertos públicos y UID/permisos de secretos.
- [ ] Demostrar rechazo ante montaje ausente/UUID incorrecto/PG_VERSION ausente; demostrar persistencia de catálogo e imágenes tras reinicios.
- [ ] Ejecutar instalación nueva, rechazo de install sobre app existente, update con backup, esquema incompatible, falla de backup y recuperación manual sin migración implícita.
- [ ] Ejecutar backup/restore Docker con cifrado, imágenes y trabajos pendientes, y confirmar que weekly-backup no levanta app detenida. Registrar resultados y tiempos sin afirmar Oracle.

**Límites:** Sin acceso externo privilegiado, datos reales, gasto, commit/push/merge/deploy ni cambios a otros proyectos sin autorización específica. No repetir evidencia válida; registrar qué cambio justifica cada prueba nueva.
