# Ticket 05 — Secuencia de instalación pendiente

Actualizado 25/10/2026, America/Guatemala. **INSTALACIÓN NO EJECUTADA. NO-GO EXTERNO.** La consolidación técnica mediante PR/merge está autorizada; el usuario confirmó que la cuenta independiente del amigo y la aprobación de contenido siguen pendientes. No acceder a la cuenta/VM del hackathon. Esta secuencia reutiliza la [guía existente](guia-oracle.md); recursos, acceso del amigo y publicación requieren cerrar las puertas siguientes. Ticket 06 se ejecuta después de instalar, con las autorizaciones externas correspondientes.

## Puertas previas

| Requisito | Estado y evidencia |
|---|---|
| Tickets 01/02 | Cerrados localmente; conservar [ARM64/backup/restore](../../../artifacts/oracle-preparation/ticket-02/RESULTADO.md). No volver a ejecutar por este cambio de formulario. |
| Ticket 03: recursos | Falta ficha de la cuenta independiente del amigo/región/uso de sus compartments, cuota efectiva/costo incremental de CPU/RAM, boot/datos/backups/IP y capacidad disponible. No asumir Q0 ni compartir/reducir el hackathon. [Ficha](cuota-hostname.md). |
| Ticket 03: hostname | Falta escoger y comprobar disponibilidad, proveedor y control de DNS. Sin registro ni cambios realizados. |
| Dependencias | Remediación `986850c` integrada en `main` `81f9201`; package/lock verificados por hash. Audit completo del 25/10: **0 vulnerabilidades reportadas**. ARM64 del 24/10 reutilizable porque código y dependencias de producción no cambian. [Evidencia](../../../artifacts/oracle-preparation/ticket-03/remediation-evidence.json). No certifica el SO ni avisos futuros. |
| Ticket 04 | Aceptación real de dueños pendiente: catálogo, fotos/derechos, presentaciones, precios, políticas/contacto/horarios/entregas, personas OWNER/ADMIN y fixtures. [Ficha](aceptacion-duenos.md). La demo local del 24/10 pasó 4/4 recorridos; no sustituye aceptación. La base pública empieza sin pedidos ficticios. |
| Release | `main` remoto verificado antes de integrar: `81f920185a2642b3c242354092f169f59e7fb585`; demo `5dbcdb2`. Admin UX 2.0, Ticket 12, fotografías y remediación ya integrados. Seleccionar el SHA completo resultante del PR de consolidación y comprobarlo antes de instalar. [Checkpoint vigente](CHECKPOINT.md). |
| Autorización | Commit, PR, merge y push técnicos autorizados el 25/10, sujetos a checks/protecciones. No autoriza recursos facturables, upgrade, cuenta/VM anterior ni publicación de contenido pendiente. Mostrar configuración/costos/permisos exactos antes de crear recursos en la cuenta del amigo. |

## Orden exacto tras cerrar las puertas

1. **Seleccionar candidato integrado.** Usar el SHA completo resultante del PR técnico autorizado; verificar protecciones, checks y origen remoto. Preparar un checkout de release limpio en el destino nuevo: `ops.py` rechaza archivos modificados o sin seguimiento. No copiar este worktree con evidencia/secretos. Verificar ancestros Admin UX 2.0/Ticket 12/01/02/04 y contenido 05 por diff, no solo por nombre de rama.
2. **Confirmar Q0 y aprobar recursos independientes.** Completar ficha de Ticket 03. Propuesta conservada: A1 1 OCPU/6 GB, boot/datos/backups 50/50/50 GB, sujeta a cuota/uso/capacidad reales. Si no cabe o tiene costo, detenerse; no usar créditos como prueba de gratuidad ni tocar hackathon. Crear solo la VM/red/volúmenes/IP expresamente aprobados según pasos 7–11 de la guía.
3. **Autorizar acceso y preparar host.** Clave nueva, fingerprint verificado, Ubuntu ARM64 elegible. Actualizaciones, reinicio, Docker/Compose compatibles y firewall según pasos 12 y 17. SSH 22 limitado al CIDR del operador; sin login root/password. Mantener inicialmente 80/443 cerrados. Nunca exponer 3000, 5432 ni socket/API Docker; revisar IPv6 y reglas Docker además del firewall del host.
4. **Preparar discos nuevos identificados.** Ver pasos 13–16: confirmar dispositivos vacíos; el procedimiento no infiere nombres ni formatea automáticamente. Montar por UUID en `/srv/guteli-data` y `/srv/guteli-backups`, revisar fstab y reboot. Datos: postgres 999:999/0700, uploads y caddy 1001:1001/0700. Backups root/0700. Crear marcadores solo en montajes verificados. No fallback al boot.
5. **Preparar configuración privada.** Copiar `infra/oracle/compose.env.example` y `runtime.env.example` a `/etc/guteli/` (root0700; archivos0600). Completar hostname, IDs/digests de imágenes, rutas, UUID y correo ACME autorizado. DB/auth/rate/receipt y clave de backups independientes, sin imprimirlos ni incluirlos en Git/evidencia. `postgres-password`: UID999,0400/0600. Conservar recuperación de secretos fuera del servidor. `DATABASE_URL` apunta al servicio privado `database`; `BETTER_AUTH_URL=https://HOSTNAME_APROBADO`, `UPLOADS_ROOT=/app/uploads`, `TRUSTED_PROXY_HOPS=1`.
6. **Construir release aprobado.** Usar comando ARM64 del paso 21 y digests revisados en `infra/oracle/images.lock.json`, targets `runner` y `builder`, label `org.opencontainers.image.revision=SHA_COMPLETO`. Guardar ID inmutable de runner en `GUTELI_APP_IMAGE`. La remediación del 24/10 ya validó el formulario y Next/sharp en ARM64. No repetir ese ensayo local por cambios de documentación o exclusión de metadata privada del contexto Docker. En el destino construir o importar una imagen verificable del SHA aprobado; cualquier cambio de dependencias/binarios requiere nueva validación dirigida. Nunca copiar node_modules de macOS.
7. **Inicializar base nueva y aplicar SQL aprobado.** `ops.py config` sin revelar secretos; bootstrap explícito del paso 23 solo si el volumen nuevo está vacío, sin `PG_VERSION`. Detener/retirar únicamente el contenedor efímero de bootstrap, arrancar `database`; aplicar migraciones revisadas con el tools container del paso 24 en red `guteli-oracle_backend`. No hay migración nueva para fotografías. No ejecutar `db:seed`, `scripts/local-demo/*` ni `practice-orders.ts` en la base pública. No copiar la base ni las cuentas locales: cargar solo catálogo aprobado mediante el administrador privado.
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
12. **Continuar con operación y recuperación de Ticket 06.** Registrar SHA/ID de imagen, UUID, esquema y configuración sin secretos; conservar checkout/imagen previa si aplica y copias privadas. Primera instalación fallida: cerrar publicación y detener solo app/proxy nuevos, conservar DB/uploads y diagnosticar; no borrar discos ni reutilizar install sobre app existente. Ejecutar backup cifrado, restauración aislada y reinicio de la nueva VM en la ventana aprobada, siguiendo [operación](operacion.md). Activar timers solo después del restore probado. Elegir y autorizar cuenta/destinatario del monitor externo antes de configurarlo; demostrar alerta de fallo y recuperación, incluyendo fallos de backup con web disponible. No declarar completado mientras falte una comprobación.

## Persistencia y límites comerciales

`compose.yaml` monta `${GUTELI_DATA_ROOT}/uploads` en `/app/uploads` con `create_host_path: false`. Los bytes se guardan con claves UUID WebP y nombres físicos seguros; no dependen del contenedor ni del nombre enviado por el usuario. `ops.py backup` incluye dump, uploads y manifiesto/hash en archivo cifrado/autenticado sobre volumen separado; restore valida hashes. Evidencia de reinicio/backup/restore ya aprobada en Ticket 02; no se sustituyó almacenamiento ni se añadió servicio externo. Se deberá demostrar de nuevo en discos reales al abordar la operación autorizada; volumen en la misma VM no equivale a copia independiente fuera de la cuenta.

Mantener exactamente false: `COMMERCIAL_ORDERS_ENABLED`, `PAYMENTS_ENABLED`, `WHATSAPP_NOTIFICATIONS_ENABLED`, `WHATSAPP_WEBHOOKS_ENABLED`; Compose las fuerza y `ops.py` las verifica. Build demo con `NEXT_PUBLIC_DEMO_MODE=true`. No worker ni proveedores. Cambiar imágenes, crear cuenta o seleccionar método de pago nunca autoriza comercio ni verifica fondos.

## Autorización que debe dar el propietario

Después de cerrar 03/04: (a) seleccionar el SHA integrado; (b) presentar y aprobar VM/red/volúmenes/IP concretos en la cuenta independiente, región y costo Q0 demostrado sin créditos; (c) confirmar autorización del amigo y usuario propio con permisos delimitados, SSH/software/reboot/firewall; (d) inicialización/migraciones y cuentas individuales; (e) hostname/DNS/ACME y contenido aprobado para **demo sin comercio**; (f) ventana de recuperación y cuenta/destinatario de monitoreo gratuito. No enviar secretos. No incluye pagos, recursos facturables, upgrade ni acceso a la cuenta del hackathon.

## Alcance de la consolidación del 25/10

Se integran los scripts reproducibles de demo local y su evidencia, se excluye `.local-demo/` también de Docker y se actualizan estas instrucciones. Sin cambios a aplicación, migraciones, dependencias o binarios. La [ficha de cuota/hostname](cuota-hostname.md) está disponible en Git con campos pendientes; no se ejecutó ningún paso externo. La guía y evidencia de 24/10 siguen siendo pruebas locales.
