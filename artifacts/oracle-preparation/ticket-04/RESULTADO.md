# Ticket 04 — Resultado de preparación para aceptación

23/10/2026, America/Guatemala. Worktree `guteli-oracle-always-free/Guteli Bakery`, rama `infra/oracle-always-free-preparation`, HEAD `6eb72daed77589049828aa3338469ebcbbcea3f6`.

**Paquete técnico/documental preparado para revisión sobre evidencia. Sesión interactiva bloqueada por entorno temporal incompleto. Aceptación comercial PENDIENTE DE LOS DUEÑOS.** No se declara aceptación definitiva ni autorización de publicación.

## Entregables sin duplicación

- [Ficha única para dueños](../../../docs/operations/oracle/aceptacion-duenos.md): checklist, inventario existente, guía rápida vinculada al manual vigente, roles, ejercicios, cinco referencias PRUEBA, decisiones y registro de aprobación.
- [Guía del dueño existente](../../../docs/operations/guia-del-dueno.md): reutilizada sin duplicarla ni cambiar sus instrucciones comerciales.
- Este reporte registra resultados y límites. [Checkpoint](../../../docs/operations/oracle/CHECKPOINT.md) e [índice](../../../.scratch/oracle-remaining/README.md) actualizados; criterios comerciales del Ticket 04 permanecen sin marcar.

## Resultados

«Aprobado» en esta tabla significa verificación técnica dentro del alcance indicado, nunca aprobación comercial.

| Área | Resultado técnico | Evidencia y límite | Aceptación dueños |
|---|---|---|---|
| Catálogo y precios Q | Aprobado por evidencia reutilizada | 10 productos, 4 categorías del catálogo inicial. Pruebas de creación/edición/reordenamiento/desactivación e imágenes en `browser-admin.txt` e `integration.txt`. No se certifica inventario comercial actual. | Pendiente |
| Presentaciones e imágenes | Requiere corrección comercial | 4 presentaciones nulas: 3 Bagels y Burger buns. Nuditos sin foto; fallback se identifica como ilustración. 9 archivos de imagen existentes. Sin completar datos por suposición. | Pendiente |
| Disponibilidad y promociones | Aprobado técnicamente por evidencia reutilizada | Activo/inactivo y existencias; prueba de descuentos vigentes/vencidos y mayor descuento, sin sumar. No hay promoción ni disponibilidad aprobada por dueños. | Pendiente |
| Administrador y formularios | Aprobado por evidencia reutilizada | 11 recorridos previos: acceso, catálogo, pedidos y usuarios. No repetidos. | Pendiente |
| OWNER/ADMIN, MFA, último OWNER | Aprobado por evidencia reutilizada | Integración: 10 casos de usuarios, 5 de autorización y matriz de límites de 4 casos. Incluye sesión, MFA, reautenticación, último OWNER y concurrencia. No se crearon cuentas reales. | Pendiente de personas y práctica |
| Cinco PRUEBA y estados | Aprobado documental; consulta actual bloqueada | Manifiesto original con cinco referencias, estados y cantidades; carga exitosa y segunda carga rechazada. No demuestra estado actual en DB. | Pendiente |
| Referencias PRUEBA en administrador | Corregido; aprobado en regresión unitaria dirigida | Buscador y 4 rutas privadas antes rechazaban los identificadores creados por el script. 10 pruebas pasan sin DB; autenticación y rol OWNER siguen exigidos. Recorrido autenticado con persistencia pendiente. | Pendiente |
| Tienda demo y bloqueo servidor | Aprobado por evidencia reutilizada | Carrito 390/1440 px, persistencia de cantidad y 4 POST públicos con 403 `COMMERCIAL_DEMO`. Código público sin cambios en este ticket. | Pendiente |
| Usabilidad escritorio/móvil | Aprobado dentro de evidencia previa | Recorrido Admin UX integrado 1/1 y 28 reportes axe sin violaciones según registro previo; capturas de administrador y carrito revisadas. No sustituye prueba con dueños o todos los dispositivos. | Pendiente |
| Datos comerciales y políticas | Pendiente | Ficha concentra decisiones sin inventarlas; manual reconoce que no existe registro de cobro verificado. | Pendiente |
| Publicación | Bloqueado | Ticket 03: 23 vulnerabilidades npm (6 moderadas, 14 altas, 3 críticas); 12 entradas con filtro producción. Sin remediar ni repetir auditoría. | No autorizada |

## Corrección acotada

El script de práctica genera `PRUEBA-1-<8 hex>` a `PRUEBA-5-<8 hex>`. El buscador y las rutas privadas de detalle, estado, cotización y método de pago solo aceptaban `GUT-AA-XXXXXXXX`. El detalle de página podía abrirse desde el listado, pero buscar o guardar cambios del fixture fallaba por validación.

Se añadió un validador compartido **solo administrativo** para los dos formatos exactos. El buscador conserva el prefijo PRUEBA y normaliza su sufijo hexadecimal a minúsculas, como está almacenado; mantiene la normalización comercial a mayúsculas. No se renombraron registros ni cambió el generador público, la autorización, los estados permitidos, precios, bloqueos comerciales o proveedores.

Archivos: `src/server/orders/admin-order-reference.ts`, `admin-list-orders.ts`, cuatro `src/app/api/admin/orders/[id]/**/route.ts` y `tests/unit/admin-practice-orders.test.ts`. Se leyó la guía instalada de Next para Route Handlers antes de editar. No hubo refactor adicional.

## Verificación nueva y evidencia reutilizada

Antes del cambio, **107 archivos** relevantes de fuentes, pruebas y evidencia coincidieron con el manifiesto original o la base integrada `082959d`. Los hashes de cierre no certifican retrospectivamente el inicio de cada prueba. [evidence.json](evidence.json) conserva alcance, hashes y comprobaciones del ticket.

Ejecutado únicamente para el cambio nuevo:

1. `vitest run tests/unit/admin-practice-orders.test.ts`: RED 6 fallos/4 aprobadas; GREEN 10/10. Comprueba los cinco identificadores, normalización GUT, formatos inválidos, llegada a la autorización en las cuatro rutas, rechazo anónimo y OWNER para método de pago. La sesión es simulada y una DB trampa falla ante cualquier acceso: **no es una prueba de persistencia ni MFA real nueva**.
2. ESLint solo sobre los siete archivos nuevos/modificados del arreglo: aprobado.
3. `tsc --noEmit --incremental false`: comprobación estática, sin build. Se corrigió un campo sobrante del fixture de prueba detectado en la primera ejecución; resultado final aprobado.
4. Enlaces locales de los documentos nuevos, integridad de evidencia reutilizada, manifiesto PRUEBA y `git diff --check`.

Logs [RED](red.txt), [GREEN final](green.txt), [comprobaciones](checks.txt). Sin suites completas, Docker/ARM64, audit npm, instalaciones de dependencias ni reconstrucción de evidencia antigua.

Evidencia reutilizada (no contar como pruebas ejecutadas en Ticket 04):

- [Administrador 11/11](../browser-admin.txt), [demo 3/3](../browser-demo-final.txt), [integración histórica](../integration.txt); se usan únicamente los casos pertinentes, sin sumar suites solapadas.
- [Admin UX integrado 1/1](../../admin-ux-2/integration/ux.txt) y [resultados existentes](../../admin-ux-2/integration/results.json).
- [Carga PRUEBA](../practice-orders.txt), [rechazo de recarga](../practice-rejection.txt); manifiesto externo `/private/tmp/guteli-oracle-validation.WyjKLo/practice-manifest.json`, fechado 18/10/2026, contrastado con el script sin volver a ejecutarlo.
- Capturas enlazadas en la ficha, conservadas en sus ubicaciones; no generadas otra vez. La captura de 24 pedidos de Admin UX usa fixtures distintos de los cinco PRUEBA.

## Bloqueo local y límites

El 23/10 se verificó que el directorio nativo `pgdata` citado por el checkpoint existe pero **no contiene `PG_VERSION`**. Se conserva el manifiesto PRUEBA y las carpetas restantes; no se diagnosticó la causa, no se intentó arrancar ni reconstruir el cluster y no se borró nada. No afirmar que basta con `pg_ctl start`, que existen cinco pedidos consultables actualmente o que los archivos restantes forman un cluster íntegro.

La revisión de pantallas y documentación puede continuar. Antes de la reunión interactiva se necesita recuperar un entorno sintético válido en destino nuevo con evidencia y luego comprobar solo el recorrido cambiado. Esa recuperación no se ejecutó ni implica iniciar Tickets 05/06. No se tocó Docker ni Oracle. La evidencia ARM64 del Ticket 02 sigue histórica y conservada; no prueba el estado actual del cluster nativo.

Las cuatro presentaciones, fotografía pendiente, identidad de imágenes, disponibilidad, promociones, contacto, horarios, entregas, pagos, políticas, accesos individuales y conservación de fixtures requieren decisión real. Cobros verificados son un flujo comercial pendiente; no se implementó ni se amplió el ticket.

Sin commit/push/merge/deploy, acceso a Oracle/hackathon, cuentas reales, mensajes, cobros ni cambios a datos comerciales. Tickets 01–03 y evidencia previa conservados; publicación sigue bloqueada y Tickets 05/06 no iniciados.

## Integración local autorizada — 23/10/2026

La instrucción posterior «mergea al main» autoriza el commit del Ticket 04 y su merge local a `main`. Se conserva el bloqueo de publicación por dependencias y la aceptación comercial pendiente. No autoriza push, deploy, comercio ni acceso Oracle. Los cambios no publicados del Ticket 03 permanecen en el worktree de preparación y no se incluyen en este commit.

Se integran corrección, prueba dirigida, ficha y evidencia agregada. Logs crudos y capturas previas permanecen locales en el worktree de preparación; sus enlaces pueden no resolver en otros checkouts. Las pruebas 10/10, ESLint y TypeScript se reutilizan: los siete archivos coinciden con los hashes de la ejecución final y main no aporta diferencias funcionales ni de dependencias.
