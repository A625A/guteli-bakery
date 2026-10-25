# Güteli en Oracle: preparación local

Estado vigente al 25/10/2026: **no instalado ni publicado**. Leer primero el [checkpoint](CHECKPOINT.md) y la [secuencia de instalación actualizada](instalacion-ticket-05.md). Git técnico autorizado mediante PR; cuenta independiente y contenido sin aprobación. Las referencias de procedencia siguientes son históricas.

Esta entrega prepara una demostración de la futura tienda oficial. Catálogo y carrito funcionan; el servidor rechaza pedidos/checkout públicos por defecto. No cobra, no envía WhatsApp automático y no recolecta datos de checkout. Catálogo, cuentas, OWNER/ADMIN y MFA conservan sus controles existentes. GTQ y horario de Guatemala permanecen.

## Lectura y estado

1. [Arquitectura, seguridad y costos](arquitectura-costos.md).
2. [Guía manual de Oracle y primera instalación](guia-oracle.md).
3. [Mantenimiento, versiones, copias y recuperación](operacion.md).
4. [Catálogo, cuentas, prácticas y lanzamiento](lanzamiento.md).
5. [Matriz de validación y pendientes](validacion.md).

| Categoría | Significado |
|---|---|
| PREPARADO LOCALMENTE | Archivos/configuración/procedimiento disponibles para revisión. |
| VALIDADO LOCALMENTE | Una prueba ejecutada tiene evidencia en `artifacts/oracle-preparation/`. |
| PENDIENTE DE VALIDACIÓN EN ORACLE | Cuotas, capacidad, red, volúmenes Linux, contenedores ARM64, TLS público, reinicios y alertas reales. |
| PENDIENTE DE AUTORIZACIÓN | Recursos, instalación, DNS, publicación, cuentas reales, programación y todo cambio de datos reales. |

## Procedencia y aislamiento

Repositorio: A625A/guteli-bakery. Rama local `infra/oracle-always-free-preparation`, worktree `/Users/andrewarana/.codex/worktrees/guteli-oracle-always-free/Guteli Bakery`.
Base exacta: `082959dafe57cf1ec5fdfed00a0aa71f99de64b4`, referencia `origin/main` **observada localmente**, sin fetch ni comprobación remota durante esta tarea. El checkout principal permanece en `4845ecfd693eca20a8d5628cfb6796e87acefe9f` con `products/` no rastreado. No se incorporan esos archivos.

`082959d` ya es descendiente de `4845ecf` (Ticket 12) y `18703b1` (Admin UX 2.0). El worktree `guteli-admin-ux-2/Guteli Bakery`, rama `main-admin-ux-2-integration`, estaba limpio. No se realizó esa integración en esta tarea. Revalidar el candidato final después de cualquier cambio posterior; no instalar una base anterior al merge ni sustituir este trabajo por una mezcla manual de archivos.

Tickets 10/11 tienen preparación adicional; **no quedan certificados para operación comercial**. Ticket 12 se preserva; Ticket 13 necesita aceptación comercial del dueño; Ticket 14 mantiene el go/no-go externo. Los estados históricos `draft` de algunos tickets no sustituyen los commits ni autorizan activaciones. La solicitud actual autoriza estos archivos locales, no cambios remotos.

## Entradas principales

- `infra/oracle/compose.yaml`: stack independiente; no usar como override del Compose de desarrollo.
- `infra/oracle/Dockerfile`: lockfile npm, digest de Node obligatorio, usuario 1001.
- `infra/oracle/Caddyfile`: hostname canónico, HTTPS, reescritura de cabeceras, sin access logs.
- `scripts/oracle/ops.py`: configuración, preflight, esquema, instalación/actualización manual, backup cifrado y restauración local aislada.
- `scripts/oracle/practice-orders.ts`: cinco fixtures explícitos, sin endpoint web ni borrado.
- `infra/oracle/*.service`, `*.timer`: plantillas **no instaladas ni habilitadas**.

Los archivos `.example` contienen marcadores deliberadamente inválidos. No existe configuración de cuenta Oracle ni secretos reales en esta entrega. Los scripts rechazan plantillas incompletas y releases sucias. Instalar únicamente desde un checkout limpio del SHA integrado y autorizado; nunca copiar el runtime local. La autorización de Git no sustituye las puertas externas de instalación.
