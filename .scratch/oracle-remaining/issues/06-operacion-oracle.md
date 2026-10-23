# 06: Demostrar recuperación y alertas en Oracle

**What to build / Qué entrega:** El operador puede identificar fallos y recuperar la demo con evidencia de datos e imágenes, no sólo servicios encendidos.

**Blocked by / Bloqueado por:** 05 — instalación; autorización de timers, ventanas, correos y pruebas de incidente.

**Status / Estado:** BLOQUEADO / NO AUTORIZADO EN ESTA TAREA.

**Criterios de aceptación:**

- [ ] Probar backup cifrado y restauración aislada desde el volumen separado, recuperación tras reinicio de VM y reconstrucción autorizada sin borrar datos productivos.
- [ ] Validar actualización y rollback compatibles con esquema; registrar RPO/RTO observado y límite semanal de hasta 7 días.
- [ ] Configurar monitor gratuito/correo con autorización y probar aviso/recuperación; distinguir cobertura externa de fallos internos. Resolver o aceptar explícitamente la brecha de alerta de backup con sitio aún disponible.
- [ ] Activar timer semanal sólo tras restore probado, validar timezone/retención de 4 copias/espacio/fallos y responsabilidad de revisar copias sin borrado automático.
- [ ] Registrar go/no-go de demo; mantener abierta aceptación comercial de Ticket11/14 y revisión de frecuencia/copia independiente antes de pedidos reales.

**Límites:** Sin acceso externo privilegiado, datos reales, gasto, commit/push/merge/deploy ni cambios a otros proyectos sin autorización específica. No repetir evidencia válida; registrar qué cambio justifica cada prueba nueva.
