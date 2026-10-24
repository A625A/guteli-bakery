# 04: Aprobar catálogo y operación de la demo

**What to build / Qué entrega:** La futura demo presenta únicamente contenido aprobado y los dueños conocen permisos, límites comerciales y prácticas.

**Blocked by / Bloqueado por:** Participación de propietarios; puede revisarse sobre la evidencia local sin depender de Oracle.

**Status / Estado:** PREPARACIÓN SOBRE EVIDENCIA LISTA (23/10/2026). PENDIENTE DE ACEPTACIÓN DEL DUEÑO. Ensayo interactivo bloqueado por entorno local incompleto.

**Criterios de aceptación:**

- [ ] Aprobar productos, unidades, precios GTQ, fotografías, disponibilidad, horarios, contacto, recogida, entrega y políticas; no aprobar seed por omisión.
- [ ] Definir personas OWNER y ADMIN sin recopilar contraseñas; aceptar cuentas individuales/MFA/recuperación y protección del último propietario.
- [ ] Revisar carrito demo y gestión de catálogo sobre evidencia existente; repetir sólo si hay cambios o una duda concreta.
- [ ] Aceptar carga explícita PRUEBA, su efecto en métricas y el plan sin borrado automático; identificar autorización necesaria antes de limpiar fixtures reales.
- [ ] Documentar que no hay pagos ni mensajes automáticos y que seleccionar método o completar un fixture no verifica fondos.

**Límites:** Sin acceso externo privilegiado, datos reales, gasto, commit/push/merge/deploy ni cambios a otros proyectos sin autorización específica. No repetir evidencia válida; registrar qué cambio justifica cada prueba nueva.

## Preparación realizada — 23/10/2026

- [Ficha de aceptación](../../../docs/operations/oracle/aceptacion-duenos.md): checklist, catálogo existente, guía breve sin duplicar manual, escenarios ficticios y decisiones pendientes.
- [Reporte técnico](../../../artifacts/oracle-preparation/ticket-04/RESULTADO.md): resultados aprobado/pendiente/bloqueado/requiere corrección, evidencia y límites.
- Evidencia local previa reutilizada; 107 coincidencias de hashes/base antes del cambio. Corrección acotada de referencias PRUEBA en búsqueda y 4 rutas privadas; 10 pruebas nuevas pasan, ESLint dirigido y comprobación TypeScript aprobados.
- Cinco PRUEBA/estados contrastados con manifiesto de creación y logs históricos; no consulta actual: cluster nativo sin `PG_VERSION`. No se reconstruyó, borró ni recargó. Reunión documental posible; ensayo interactivo requiere entorno sintético recuperado.
- Cuatro presentaciones y foto de Nuditos por resolver; demás decisiones comerciales en la ficha. Los criterios de aceptación anteriores se mantienen sin marcar hasta revisión real de dueños.
- Bloqueo npm de Ticket 03 intacto. Sin Git de escritura, despliegue, comercio, mensajes, Oracle/hackathon ni Tickets 05/06.

## Integración local autorizada — 23/10/2026

La instrucción posterior «mergea al main» autoriza el commit del Ticket 04 y su merge local a `main`. Se conserva el bloqueo de publicación por dependencias y la aceptación comercial pendiente. No autoriza push, deploy, comercio ni acceso Oracle. Los cambios no publicados del Ticket 03 permanecen en el worktree de preparación y no se incluyen en este commit.

Se integran corrección, prueba dirigida, ficha y evidencia agregada. Logs crudos y capturas previas permanecen locales en el worktree de preparación; sus enlaces pueden no resolver en otros checkouts. Las pruebas 10/10, ESLint y TypeScript se reutilizan: los siete archivos coinciden con los hashes de la ejecución final y main no aporta diferencias funcionales ni de dependencias.
