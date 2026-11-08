# Ticket 03 — Ficha de cuenta independiente y hostname

25/10/2026, America/Guatemala. **NO-GO: cuenta sin confirmar, Q0 no demostrado, capacidad y hostname desconocidos.** El usuario confirmó que la cuenta del amigo todavía no está disponible. No se accedió a Oracle. Esta ficha completa el enlace de la guía existente; no autoriza crear recursos.

## Configuración que debe cotizarse antes de autorizar

| Componente | Propuesta exacta, aún no aprobada | Costo confirmado |
|---|---|---|
| Cuenta y acceso | Tenancy independiente del amigo; usuario individual autorizado, MFA, permisos limitados a Güteli | Pendiente |
| Región y VM | Región principal por confirmar; `VM.Standard.A1.Flex`, 1 OCPU, 6 GB RAM; Ubuntu 24.04 LTS ARM64 solo si resulta elegible | Pendiente |
| Almacenamiento | Boot 50 GB + datos 50 GB + backups 50 GB: 150 GB provisionados; rendimiento/VPU elegible por confirmar | Pendiente |
| Red | Compartment, VCN, subnet, NSG, VNIC, Internet Gateway e IPv4 propios; sin NAT, balanceador ni otros extras | Pendiente |
| Backups | Archivos cifrados en volumen separado; máximo 4 copias sin borrado automático. Sin snapshots OCI adicionales propuestos | Pendiente |
| DNS/TLS | Subdominio gratuito por elegir y verificar, A hacia IP nueva; Caddy/ACME, correo autorizado | Pendiente |
| Monitoreo | Servicio gratuito y destinatario por aprobar; verificar cobertura HTTPS y fallos internos antes de activarlo | Pendiente |

La propuesta consume 744 OCPU-h y 4,464 GB-h en un mes de 31 días. Es cálculo de demanda, **no cuota disponible ni cotización**. Cuota gratuita efectiva, consumo acumulado, región/AD, capacidad física, VPU, IP, egreso y condiciones de cuenta deben comprobarse en la cuenta nueva. No trasladar cuotas de otra tenancy ni usar créditos promocionales para afirmar Q0. No hacer upgrade ni aceptar recursos pagos.

## Comprobación de solo lectura cuando exista autorización del amigo

Completar en privado, con datos agregados y sin claves, tokens, OCID completos ni información de facturación personal:

- Alias de cuenta independiente, tipo de cuenta, fin de trial si aplica, región principal/seleccionada y AD.
- Confirmación del amigo, usuario propio con MFA y alcance concedido. Para inspección: acceso de lectura a límites, cuotas, inventario y costos; si falta visibilidad, marcar desconocido. No usar credenciales compartidas.
- Inventario y uso de todos los compartments de **esa cuenta**, incluyendo recursos detenidos y discos retenidos. No inspeccionar la cuenta del hackathon.
- Límite/uso/disponible y beneficio gratuito efectivo de A1 OCPU/RAM, boot/block GB, VPU, backups, VCN/VNIC/IP y salida mensual.
- Resumen del estimador por componente, moneda, cargos recurrentes sin créditos y evidencia de elegibilidad. Q0 debe quedar demostrado para el conjunto, no solo Compute.
- Capacidad A1: registrar disponibilidad informada y sus límites. La asignación solo se confirma al crear tras aprobación; ante falta de capacidad, detenerse, nunca cambiar a shape pago.
- Dos o tres nombres de subdominio y proveedor preferido. La disponibilidad requiere comprobación en el proveedor; NXDOMAIN no demuestra que pueda registrarse.

Antes de crear: mostrar esta tabla completada y los permisos de creación/gestión propuestos para el compartment Güteli (Compute, red, volúmenes; IAM administrado por el dueño). Revisar la política concreta con él; no pedir administración global por defecto. Solicitar aprobación del conjunto exacto. La guía de [instalación](instalacion-ticket-05.md) contiene las siguientes puertas de SSH, discos, DB, cuentas, DNS y publicación.

Consultar las fuentes oficiales al completar los valores: [Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm), [límites y uso](https://docs.oracle.com/en-us/iaas/Content/General/service-limits/view-tenancy.htm) y [estimador](https://www.oracle.com/cloud/costestimator.html). Estos enlaces son referencias para la comprobación pendiente; no se presentan como una consulta de tarifas realizada hoy.
