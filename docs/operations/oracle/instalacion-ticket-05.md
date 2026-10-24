# Ticket 05 — Secuencia de instalación pendiente

23/10/2026, America/Guatemala. **NO EJECUTADA. NO-GO.** Este documento concreta la instalación futura usando la [guía existente](guia-oracle.md); no autoriza recursos, SSH, DNS, certificados ni publicación. Ticket 06 queda fuera.

## Puertas previas

| Requisito | Estado y evidencia |
|---|---|
| Tickets 01/02 | Cerrados localmente; conservar [ARM64/backup/restore](../../../artifacts/oracle-preparation/ticket-02/RESULTADO.md). No volver a ejecutar por este cambio de formulario. |
| Ticket 03: recursos | Falta ficha de cuenta/región/uso de todos los compartments, cuota efectiva/costo incremental de CPU/RAM, boot/datos/backups/IP y capacidad disponible. No asumir Q0 ni compartir/reducir el hackathon. [Ficha](cuota-hostname.md). |
| Ticket 03: hostname | Falta escoger y comprobar disponibilidad, proveedor y control de DNS. Sin registro ni cambios realizados. |
| Dependencias | **Bloqueo de publicación**: último reporte conservado 23 vulnerabilidades (6 moderadas, 14 altas, 3 críticas); filtro producción 12. Next y sharp incluidos. Lockfile sin remediar. Autorizar y ejecutar el [plan dirigido](plan-remediacion-ticket-03.md), repetir comprobación de seguridad y validaciones afectadas antes de elegir release. No excepción implícita por ser demo. |
| Ticket 04 | Aceptación real de dueños pendiente: catálogo, fotos/derechos, presentaciones, precios, políticas/contacto/horarios/entregas, personas OWNER/ADMIN y fixtures. [Ficha](aceptacion-duenos.md). La nueva prueba de fotos no recupera el cluster anterior ni certifica cinco PRUEBA actuales. |
| Release | Admin UX 2.0/Ticket 12 y correcciones 01/02 son ancestros de esta rama; Ticket 04 está en `2b9db89`. Fotografías 05 versionadas localmente en `c4ef53274820e6f3205f092a651123c0493e0bd9`. Documentación 03 y remediación siguen pendientes. **No hay release autorizado para instalar**; un commit local no cierra esas puertas. |
| Autorización | Commits locales de Ticket 05 autorizados; push, merge, release y todas las operaciones externas requieren aprobación posterior. |

## Orden exacto tras cerrar las puertas

1. **Aprobar candidato y versionado.** Revisar el diff de esta rama, incluir las correcciones locales de Tickets 03–05 y la remediación aprobada. Autorizar commit/publicación exclusivamente del conjunto revisado y seleccionar SHA completo. Preparar un checkout de release limpio en el destino nuevo: `ops.py` rechaza archivos modificados o sin seguimiento. No copiar este worktree con evidencia/secretos. Verificar ancestros Admin UX 2.0/Ticket 12/01/02/04 y contenido 05 por diff, no solo por nombre de rama.
2. **Confirmar Q0 y aprobar recursos independientes.** Completar ficha de Ticket 03. Propuesta conservada: A1 1 OCPU/6 GB, boot/datos/backups 50/50/50 GB, sujeta a cuota/uso/capacidad reales. Si no cabe o tiene costo, detenerse; no usar créditos como prueba de gratuidad ni tocar hackathon. Crear solo la VM/red/volúmenes/IP expresamente aprobados según pasos 7–11 de la guía.
3. **Autorizar acceso y preparar host.** Clave nueva, fingerprint verificado, Ubuntu ARM64 elegible. Actualizaciones, reinicio, Docker/Compose compatibles y firewall según pasos 12 y 17. SSH 22 limitado al CIDR del operador; sin login root/password. Mantener inicialmente 80/443 cerrados. Nunca exponer 3000, 5432 ni socket/API Docker; revisar IPv6 y reglas Docker además del firewall del host.
4. **Preparar discos nuevos identificados.** Ver pasos 13–16: confirmar dispositivos vacíos; el procedimiento no infiere nombres ni formatea automáticamente. Montar por UUID en `/srv/guteli-data` y `/srv/guteli-backups`, revisar fstab y reboot. Datos: postgres 999:999/0700, uploads y caddy 1001:1001/0700. Backups root/0700. Crear marcadores solo en montajes verificados. No fallback al boot.
5. **Preparar configuración privada.** Copiar `infra/oracle/compose.env.example` y `runtime.env.example` a `/etc/guteli/` (root0700; archivos0600). Completar hostname, IDs/digests de imágenes, rutas, UUID y correo ACME autorizado. DB/auth/rate/receipt y clave de backups independientes, sin imprimirlos ni incluirlos en Git/evidencia. `postgres-password`: UID999,0400/0600. Conservar recuperación de secretos fuera del servidor. `DATABASE_URL` apunta al servicio privado `database`; `BETTER_AUTH_URL=https://HOSTNAME_APROBADO`, `UPLOADS_ROOT=/app/uploads`, `TRUSTED_PROXY_HOPS=1`.
6. **Construir release aprobado.** Usar comando ARM64 del paso 21 y digests revisados en `infra/oracle/images.lock.json`, targets `runner` y `builder`, label `org.opencontainers.image.revision=SHA_COMPLETO`. Guardar ID inmutable de runner en `GUTELI_APP_IMAGE`. La imagen existente del Ticket 02 no contiene el nuevo formulario. Este ticket no repite build ARM64; la futura remediación Next/sharp/binarios requerirá reconstrucción y validación dirigida antes de instalar. Nunca copiar node_modules de macOS.
7. **Inicializar base nueva y aplicar SQL aprobado.** `ops.py config` sin revelar secretos; bootstrap explícito del paso 23 solo si el volumen nuevo está vacío, sin `PG_VERSION`. Detener/retirar únicamente el contenedor efímero de bootstrap, arrancar `database`; aplicar migraciones revisadas con el tools container del paso 24 en red `guteli-oracle_backend`. No hay migración nueva para fotografías. No ejecutar `db:seed` de ejemplo como catálogo real.
8. **Provisionar accesos aprobados.** Primer OWNER por `npm run owner:create` interactivo del tools container, sin contraseña en argumentos/chat. Cambio de contraseña, MFA y recuperación; OWNER crea cuentas individuales ADMIN/OWNER según aceptación. Probar administración solo tras HTTPS confiable. No desactivar MFA ni editar roles en SQL.
9. **Autorizar DNS, ACME y publicación demo.** Registrar hostname aprobado y apuntar A a IP nueva, sin AAAA obsoleto. Validar resolución desde otra red y requisitos del proveedor/CAA si aplica. Configurar hostname canónico, correo ACME y `BETTER_AUTH_URL`; conservar Caddy persistente para certificados. Abrir únicamente 80/443 cuando se autorice publicar. No iniciar Caddy público antes de autorización. Sin hostname/TLS, detener instalación pública; no usar admin por HTTP/IP.
10. **Ejecutar preflight e instalación explícita**, desde raíz del release limpio, únicamente tras autorización:

```sh
python3 scripts/oracle/ops.py config --env /etc/guteli/compose.env
python3 scripts/oracle/ops.py preflight --env /etc/guteli/compose.env
python3 scripts/oracle/ops.py schema --env /etc/guteli/compose.env
# Simulación: no instala.
python3 scripts/oracle/ops.py install --env /etc/guteli/compose.env --sha SHA_COMPLETO_APROBADO
# Solo con autorización externa ya concedida:
python3 scripts/oracle/ops.py install --env /etc/guteli/compose.env --sha SHA_COMPLETO_APROBADO --apply --ack AUTORIZADO_LOCAL
```

El texto `AUTORIZADO_LOCAL` es una guarda del script, no reemplaza el consentimiento. `preflight` comprueba montajes/UUID/permisos/espacio; `schema` exige el journal exacto; `install` no hace build ni migraciones y rechaza app ya instalada.

11. **Verificar instalación real antes de declararla completa.** Desde otra red: HTTP→HTTPS canónico sin `:8443`, certificado/cadena correctos, `/readyz` 200, catálogo/carrito y fotos aprobadas visibles; admin con MFA y roles; crear/reemplazar/quitar foto autorizada y recargar; comprobar bytes de imagen tras reinicio controlado. POST a `/api/orders`, `/api/checkout-session`, `/api/checkout-review`, `/api/checkout-summary` devuelve 403 `COMMERCIAL_DEMO`. Comprobar puertos 3000/5432 cerrados. Registrar evidencia Oracle nueva, sin atribuirle resultados Colima/macOS.
12. **Conservar recuperación y detener alcance.** Registrar SHA/ID de imagen, UUID, esquema y configuración sin secretos; conservar checkout/imagen previa si aplica y copias privadas. Primera instalación fallida: cerrar publicación y detener solo app/proxy nuevos, conservar DB/uploads y diagnosticar; no borrar discos ni reutilizar install sobre app existente. La recuperación/restauración real y rollback operativo de Ticket 06 requieren autorización independiente. No habilitar timers, monitor externo ni correos/avisos en Ticket 05.

## Persistencia y límites comerciales

`compose.yaml` monta `${GUTELI_DATA_ROOT}/uploads` en `/app/uploads` con `create_host_path: false`. Los bytes se guardan con claves UUID WebP y nombres físicos seguros; no dependen del contenedor ni del nombre enviado por el usuario. `ops.py backup` incluye dump, uploads y manifiesto/hash en archivo cifrado/autenticado sobre volumen separado; restore valida hashes. Evidencia de reinicio/backup/restore ya aprobada en Ticket 02; no se sustituyó almacenamiento ni se añadió servicio externo. Se deberá demostrar de nuevo en discos reales al abordar la operación autorizada; volumen en la misma VM no equivale a copia independiente fuera de la cuenta.

Mantener exactamente false: `COMMERCIAL_ORDERS_ENABLED`, `PAYMENTS_ENABLED`, `WHATSAPP_NOTIFICATIONS_ENABLED`, `WHATSAPP_WEBHOOKS_ENABLED`; Compose las fuerza y `ops.py` las verifica. Build demo con `NEXT_PUBLIC_DEMO_MODE=true`. No worker ni proveedores. Cambiar imágenes, crear cuenta o seleccionar método de pago nunca autoriza comercio ni verifica fondos.

## Autorización que debe dar el propietario

Después de resolver vulnerabilidades y cerrar 03/04: aprobar por separado (a) archivos/commits/publicación y SHA final; (b) VM/red/volúmenes/IP elegibles concretos, región y costo Q0 comprobado; (c) SSH/software/reboot/firewall de esa VM; (d) inicialización/migraciones y cuentas individuales; (e) hostname/DNS/ACME y publicación de **demo sin comercio**. Indicar alcance/cuenta/región/hostname y personas sin enviar secretos. No incluir Ticket 06, servicios de pago, pedidos reales, pagos ni WhatsApp automático.

## Alcance de esta consolidación

Solo se versionan fotografías, pruebas y preparación local del Ticket 05. Los documentos enlazados de cuota/hostname y remediación de Ticket 03 permanecen en el worktree de preparación, fuera de estos commits; deben revisarse y versionarse antes de usar esta guía como documento de release. No se ejecutó ninguno de los pasos externos.
