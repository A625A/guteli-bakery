# Correo de respaldo para pedidos

Implementación local, deshabilitada por defecto. No se creó ninguna cuenta, remitente, destinatario ni credencial; no se envió correo real. El dueño conserva su WhatsApp personal y el panel `/admin` conserva el registro autorizado del pedido.

## Proveedor y requisitos externos

Consulta de fuentes oficiales: 2026-11-09. Resend es la opción implementada por su API transaccional y claves de idempotencia; no requiere un SDK adicional. Su plan gratuito permite **3,000 correos mensuales y 100 diarios**; los mensajes entrantes también consumen cuota. El límite diario usa UTC. Actualmente admite tres dominios verificados. Esto debería cubrir un correo por pedido en una panadería pequeña; el volumen real debe confirmarlo el dueño. [Cuotas de Resend](https://resend.com/docs/knowledge-base/account-quotas-and-limits), [precios](https://resend.com/pricing).

Para enviar a la dirección real del dueño se requiere un dominio propio y verificado; `onboarding@resend.dev` no es un remitente de producción. El operador debe completar los registros DNS que Resend indique (SPF/DKIM y política DMARC adecuada), confirmar el estado de verificación y usar una clave restringida a envío. Este trabajo no cambia DNS ni registra dominios. [Dominios verificados](https://resend.com/docs/dashboard/domains/introduction), [gestión de dominios](https://resend.com/docs/dashboard/domains/managing-domains).

Brevo es una alternativa con **300 envíos gratuitos al día**, sin acumulación diaria; la versión gratuita conserva su marca. También requiere preparar y autenticar el remitente. No se implementó un segundo adaptador porque agrega complejidad y la elección de Resend permite proteger los reintentos con una clave de idempotencia explícita. Si el volumen supera Resend, revisar la cuota o un cambio de proveedor con pruebas antes de activarlo. [Límites gratuitos de Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [autenticación del dominio](https://help.brevo.com/hc/en-us/articles/35852083084178-Domain-setup-for-better-email-deliverability).

## Flujo duradero

La creación del pedido inserta `OWNER_ORDER_EMAIL` en el outbox **en la misma transacción** que guarda el pedido. `email:order:<id interno>` es único. El snapshot contiene referencia, productos/cantidades, modalidad, fecha, método seleccionado y totales calculados por el servidor. No contiene nombre, teléfono, dirección, notas, token privado, contraseña ni credenciales. Ninguna llamada al proveedor ocurre durante checkout. Si el proveedor falla, el pedido sigue guardado y visible en el panel.

El mensaje contiene un enlace HTTPS a `/admin/orders/<referencia>/` que exige la sesión administrativa y MFA existentes. No es un enlace mágico de ingreso. Informa que los detalles corresponden al momento de guardar y pide consultar el panel para el estado, la aceptación del total y los pagos actuales. Los envíos pendientes se indican como pendientes, sin inventar un total final.

Antes del primer intento se congela en el outbox la solicitud exacta, incluidos remitente, destinatario y texto. Los reintentos usan esos mismos bytes y la misma clave. Una huella de configuración detecta cambios de cuenta/clave, origen, remitente o destinatario y bloquea el reenvío automático para evitar que el mismo pedido llegue a una dirección diferente. La clave de API nunca se guarda en el outbox.

Cada ejecución reclama una fila con bloqueo y `SKIP LOCKED`, registra un token de intento y una concesión de 60 segundos. Una ejecución simultánea no reclama esa fila. Tras una caída puede recuperarse la concesión vencida conservando clave y cuerpo. Los resultados de un intento anterior no sobrescriben un intento posterior.

Resend conserva claves durante **24 horas**. Por ello la aplicación deja de reintentar a las **23 horas desde el primer intento**, con margen de seguridad. Tras cinco intentos también requiere revisión. No se puede garantizar entrega exactamente una vez más allá de la ventana del proveedor: una respuesta perdida puede haber sido aceptada. Nunca generar automáticamente otra clave ni borrar/recrear el evento para "forzar" un envío. [Idempotencia de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Ejecución en Netlify

`netlify/functions/owner-order-email.mts` declara una ejecución por minuto, procesa una fila y usa un límite de ocho segundos por solicitud al proveedor. No necesita un proceso persistente ni expone una ruta pública de disparo. Solo permite envío con `CONTEXT=production` y `DEPLOYMENT_PLATFORM=netlify`. Previews y desarrollo local no envían.

Netlify ejecuta las funciones programadas en despliegues publicados; las vistas previas no disparan el cron automáticamente. El cron usa UTC y la ejecución tiene un límite de 30 segundos. El operador debe comprobar el empaquetado del módulo, su programación y las ejecuciones en el sitio autorizado. Esta implementación se validó localmente; eso no demuestra que la programación ya esté desplegada. [Funciones programadas de Netlify](https://docs.netlify.com/build/functions/scheduled-functions/).

## Activación pendiente

Se mantienen `COMMERCIAL_ORDERS_ENABLED=false`, `EMAIL_NOTIFICATIONS_ENABLED=false`, `EMAIL_PROVIDER_READY=false` y `EMAIL_TEST_CONFIRMED=false`. La configuración real requiere autorización expresa del dueño y del operador:

1. Dirección destinataria aprobada por el dueño (`EMAIL_OWNER_TO`); la aplicación no la deduce.
2. Cuenta del proveedor, dominio propio verificado, remitente (`EMAIL_FROM`) y clave (`RESEND_API_KEY`).
3. Origen HTTPS aprobado para el panel (`EMAIL_ADMIN_ORIGIN`, solo origen, sin rutas ni parámetros).
4. Prueba controlada autorizada que confirme recepción, enlace administrativo con ingreso requerido, formato y tratamiento de fallos. La prueba con fetch simulado no autoriza marcar esta prueba real como completada.
5. `EMAIL_PROVIDER=resend`, `EMAIL_SEND_AFTER` con zona horaria y fecha de activación explícita. Las filas anteriores a esa fecha se bloquean; no se reenvía automáticamente el historial acumulado.
6. Variables en el ámbito **Functions** de Netlify; `netlify.toml` no proporciona secretos de ejecución. Comprobar migraciones y almacenamiento antes de habilitar pedidos y después habilitar las banderas de correo con autorización.

Las variables de ejemplo están en `.env.example`; no copiarlas como credenciales reales. Cambiar la fecha de corte no es una herramienta para reintentar eventos anteriores sin una revisión operativa.

## Diagnóstico desde el pedido

Las notificaciones del detalle administrativo distinguen el canal por `eventType`. Para correo:

- `QUEUED/PENDING`: pendiente de procesamiento o de un reintento; si el servicio está deshabilitado no sale del servidor.
- `SENDING`: intento con concesión vigente.
- `ACCEPTED/SENT`: aceptado por la API del proveedor; **no demuestra llegada a la bandeja ni lectura**. `sentAt` no se usa para afirmar entrega.
- `EMAIL_RATE_LIMITED` o `EMAIL_PROVIDER_UNAVAILABLE`: se reintenta con espera exponencial de 1, 2, 4 y 8 minutos, hasta cinco intentos.
- `EMAIL_PROVIDER_REJECTED/FAILED`: rechazo definitivo; comprobar cuenta, remitente, cuota y configuración en el proveedor. No se almacenan mensajes crudos del proveedor.
- `EMAIL_IDEMPOTENCY_EXPIRED`, `EMAIL_RETRY_LIMIT` o `EMAIL_CONFIGURATION_CHANGED` con `UNKNOWN/BLOCKED`: comprobar el registro del proveedor y el panel antes de una intervención manual; un envío anterior podría haber sido aceptado.
- `EMAIL_BEFORE_ACTIVATION`: fila fuera de la ventana aprobada; no se envía.

El proveedor puede aceptar un correo y luego rebotarlo o clasificarlo como spam. Este alcance no implementa webhooks de entrega/rebote: revisar el panel de Resend para diagnosticarlo. El dueño debe revisar pedidos nuevos en `/admin` aunque no haya recibido un correo ni WhatsApp. Ningún fallo de notificación elimina un pedido, cambia su estado, verifica un pago o confirma el envío del mensaje del cliente.
