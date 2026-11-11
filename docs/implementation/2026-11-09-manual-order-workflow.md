# Flujo manual de pedidos — resultado local

Fecha: 2026-11-09. Base: `main`, commit `3d6af97`. Cambios locales sin commit, publicación, despliegue ni migración de producción. No se enviaron correos ni mensajes reales. Se conservaron los cambios y archivos ajenos al alcance.

## Comportamiento entregado

- Checkout exige un método elegido por el cliente: transferencia para ambas modalidades, efectivo al recoger solo para recogida, efectivo contra entrega solo para entrega. Cambiar modalidad descarta una selección de efectivo incompatible. Contrato, serialización, hash de idempotencia, persistencia, recuperación y vistas muestran el método.
- El dueño puede cambiar el método mientras el pedido siga abierto y sin pago. El cambio invalida la aceptación anterior; el método forma parte de la revisión de precios. La nueva aceptación queda auditada. Las instrucciones bancarias siguen siendo un borrador privado del dueño; no se publican automáticamente.
- El dueño con MFA reciente registra el dinero efectivamente recibido: importe exacto/GTQ, método, confirmación explícita, evidencia declarada de abono bancario o efectivo cobrado, revisión aceptada, fecha, responsable y referencia interna opcional. No acepta capturas como verificación, importes incorrectos, pedidos cancelados, revisiones/versiones antiguas ni efectivo antes de la recogida/entrega. Hay bloqueo transaccional, auditoría e idempotencia.
- `order_payment_events` conserva evidencia de cobros y devoluciones. Índices únicos evitan registros duplicados; un trigger impide modificar o borrar eventos. Un fallo tardío de auditoría revierte tanto el evento como el estado del pago.
- Cancelar no devuelve dinero ni borra el cobro. Un pedido cancelado con cobro verificado muestra que debe coordinarse la devolución. Solo se registra una devolución completa ya realizada fuera del sitio. No se implementaron devoluciones parciales, excepciones para cobrar cancelados ni integración bancaria. Los marcadores PAID/REFUNDED antiguos sin evidencia siguen identificados como no verificados.
- La confirmación pone **Enviar pedido por WhatsApp** como acción principal. El resumen se resuelve desde el servidor, conserva productos/cantidades, modalidad, fecha, método y totales pendientes/aceptados. Omite nombre, teléfono, dirección, notas y tokens. Hay copia, selección manual, reintento y tratamiento de ventanas bloqueadas, precios vencidos o cambios concurrentes. Abrir WhatsApp no se registra como envío, entrega ni pago. El cliente debe pulsar Enviar.
- El enlace privado permite consultar, aceptar y preparar el resumen del pedido exacto incluso después de vencer la cookie de recuperación de 24 horas. La capacidad se transmite únicamente a endpoints internos mediante un encabezado; el hash se comprueba bajo bloqueo y se vincula a la referencia y a un pedido no anonimizado. No se acepta un token inválido como autorización alternativa por cookie. Un pedido posterior abierto en el mismo navegador no sustituye al pedido del enlace. Esta capacidad no permite registrar cobros.
- Cada pedido nuevo encola un aviso de respaldo por correo en la misma transacción. Resend recibe contenido y clave inmutables en los reintentos. Hay concesiones, protección concurrente, espera exponencial y estados de fallo/revisión. El proveedor nunca se llama durante checkout. El panel muestra la configuración pendiente y pedidos con avisos fallidos. La función programada de Netlify procesa una fila por minuto, sin trabajador persistente.

## Validación

Las pruebas PostgreSQL usaron clústeres temporales en loopback con una base `guteli_test`, nunca Neon ni datos reales. El transporte de correo fue simulado; las navegaciones a WhatsApp se interceptaron localmente.

| Comprobación                      | Resultado                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| Unitarias                         | 405 pruebas, 62 archivos, con `--maxWorkers=2`                                                    |
| Integración PostgreSQL            | 216 pruebas, 29 archivos                                                                          |
| Navegador: handoff y pagos        | 18 casos en modo live de pruebas; 4 complementarios de demostración/regresión                     |
| Navegador: regresiones existentes | 32 casos de checkout, mapas y administración                                                      |
| TypeScript y ESLint               | Correctos                                                                                         |
| Compilación Next                  | Correcta con configuración ficticia y comercio/notificaciones deshabilitados                      |
| Función programada                | Bundle independiente con esbuild correcto                                                         |
| Migración 0017                    | Instalación, esquema final, restricciones, hashes y repetición sin cambios comprobados localmente |

La revisión detectó y se corrigió la pérdida de aceptación en el día de recogida/entrega. Hay regresiones rojo→verde para ambos métodos de efectivo. También se reprodujo y corrigió que un reintento antiguo devolviera un estado PAID después de haber registrado una devolución: el evento sigue siendo idempotente y la respuesta devuelve el estado vigente.

Un primer comando de compilación sin variables de autenticación fue rechazado correctamente por la configuración existente; la compilación final utilizó valores ficticios explícitos. Una ejecución unitaria muy paralela coincidió con la compilación de navegador y agotó plazos de CLI/ESLint; la ejecución limitada a dos procesos pasó completa sin cambiar esas pruebas. La prueba adicional de reinicio de contenedor Docker no se ejecutó: no había daemon Docker disponible. Las regresiones seleccionadas de navegador se ejecutaron con `--no-deps` para mantener ese alcance explícito.

## Pendientes externos y límites de activación

1. Aprobar el destinatario real del dueño, cuenta de Resend, dominio/remitente verificados, clave de envío, origen HTTPS administrativo y fecha explícita de activación. No se dedujo ni inventó una dirección destinataria.
2. Autorizar y realizar una prueba real de correo antes de habilitar las banderas de preparación. Aceptación por la API no significa entrega en bandeja; rebotes/entrega se revisan en el proveedor, sin webhooks implementados en este alcance.
3. Configurar variables en el ámbito Functions de Netlify y comprobar programación/empaquetado en un despliegue autorizado. La validación local no demuestra que la función ya esté desplegada.
4. Aplicar la migración `0017_fixed_zeigeist.sql` a la base operativa únicamente dentro de un procedimiento autorizado con respaldo; ninguna migración operativa se ejecutó aquí.
5. Acordar instrucciones de transferencia, procedimiento de verificación/devoluciones y rutina de revisión del panel. La cuenta bancaria no se publica automáticamente.

El comercio, los envíos reales y el despliegue requieren autorización separada. Las banderas de ejemplo conservan valores deshabilitados. La automatización Meta permanece disponible en el código y deshabilitada para este flujo.

Operación: [guía del dueño](../operations/guia-del-dueno.md). Investigación del proveedor, cuotas actuales, requisitos de dominio, límites de idempotencia y configuración: [correo de respaldo](../operations/owner-email.md).
