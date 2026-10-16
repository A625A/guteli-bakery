# Guía del dueño de Güteli

Esta guía describe las funciones preparadas localmente. La tienda mantiene los pagos en línea y los mensajes automáticos de WhatsApp desactivados. No se ha autorizado un despliegue de producción. Todos los importes de pedidos están en quetzales y los horarios se muestran para Guatemala.

## Ingresar y proteger el acceso

1. Abre el panel administrativo e ingresa tu correo y contraseña.
2. Si es tu primer ingreso, cambia la contraseña temporal y configura el autenticador.
3. Guarda los códigos de recuperación fuera del navegador, en un lugar privado. No los compartas por WhatsApp ni en chats de soporte.
4. Usa el autenticador en cada acceso que lo solicite. Si lo pierdes, usa un código de recuperación; si tampoco tienes los códigos, solicita asistencia al responsable técnico. No desactives las protecciones ni compartas la cuenta.
5. Cierra sesión cuando termines, especialmente en una computadora compartida.

El dueño puede gestionar usuarios y asignar métodos de pago. Un administrador puede atender productos y pedidos, pero no elegir el método de pago por cuenta del dueño.

## Revisar el día

En **Resumen** puedes ver pedidos por atender, productos agotados y notificaciones que requieren seguimiento. La última consulta correcta aparece con fecha y hora de Guatemala. El panel intenta actualizarse cada 30 segundos mientras está visible y al volver a la pestaña.

Si aparece un aviso de información sin actualizar, revisa la conexión y pulsa **Actualizar panel**. No tomes un dato antiguo como confirmación de que no hay pedidos nuevos. Con el panel cerrado no se reciben alertas; la tienda debe acordar una rutina de revisión. Un mensaje aceptado por el proveedor no significa entregado, y ninguno de esos estados demuestra un pago.

En **Estado de la tienda**, «Necesita atención» indica un problema que conviene revisar; «Sin comprobar» significa que falta evidencia. Si hubo errores al guardar, busca el pedido antes de pedir al cliente que lo envíe otra vez. Si un mensaje tiene resultado desconocido, no lo reenvíes hasta aclararlo. Los respaldos y la verificación de pagos siguen pendientes. Consulta la [guía de monitoreo](monitoreo-local.md) para pedir apoyo técnico.

Los enlaces privados de pedidos no deben publicarse. Atiende las solicitudes de corrección o eliminación según el [procedimiento de privacidad](privacidad-conservacion.md); la política de limpieza aún necesita aprobación y no está activada.

## Mantener productos y promociones

- En **Productos**, crea o edita nombre, categoría, descripción y presentación. En **Unidad de venta**, escribe lo que se compra: por ejemplo, «bolsa de 5 unidades».
- Escribe el precio en quetzales: `60.50` significa Q60.50. Usa punto decimal y como máximo dos decimales. No escribas `6050` para representar Q60.50.
- El identificador del enlace se sugiere al crear o duplicar. Puedes corregirlo antes de guardar; usa letras sin tildes, números y guiones. No cambies un identificador publicado sin considerar los enlaces que otras personas guardaron. Si ya existe, el formulario lo rechazará para que elijas otro.
- Una existencia vacía significa que no llevas un conteo. Cero indica agotado. Este control no es una reserva ni un límite de producción diaria.
- Desactivar oculta el producto sin retirar su historial. Para retirar un producto, marca la confirmación y luego pulsa **Retirar producto**. Los pedidos históricos se conservan.
- Duplicar crea una copia inactiva para revisarla antes de ofrecerla. No convierte la copia en un producto publicado automáticamente.
- Carga imágenes JPEG, PNG o WebP de hasta 8 MB. Revisa la vista previa y usa **Eliminar imagen** si necesitas reemplazarla.
- En **Promociones**, define porcentaje, inicio, fin, productos seleccionados o catálogo completo y si está habilitada. Los horarios corresponden a Guatemala. Si coinciden varias promociones, se aplica el descuento válido más alto; no se suman.

Los pedidos sin pago verificado siguen los precios vigentes. Una promoción vencida deja de aplicar aunque el cliente ya haya iniciado un pedido. El cliente debe volver a aceptar un total que cambió. Seleccionar un método de pago no conserva un descuento vencido.

## Buscar, cotizar y confirmar un pedido

1. En **Pedidos**, filtra por estado, modalidad o fecha, o escribe la referencia exacta, por ejemplo `GUT-26-ABC12345`.
2. Abre el detalle y revisa productos, cantidades, presentación, fecha solicitada y entrega. El listado evita mostrar teléfonos y direcciones innecesariamente.
3. Si hay entrega, ingresa su costo en **Envío en quetzales (Q)**. `5.00` significa Q5.00. Guardar una cotización requiere una nueva aceptación del cliente, incluso si vuelves a guardar el mismo importe.
4. Revisa por separado el estado del pedido, la aceptación del total, el método y el estado del pago. Un total pendiente no es cero.
5. Confirmar el pedido significa que Güteli acepta atenderlo. No significa que se haya recibido dinero. Después avanza por preparación, listo, en camino cuando corresponda y completado. El sistema ofrece solo los cambios permitidos para cada modalidad.
6. Consulta las fechas del historial si necesitas saber cuándo cambió el estado.

Si otra persona modificó el pedido, el sistema pide actualizar antes de guardar. Revisa el nuevo contenido; no repitas cambios sin comprobarlo. Si hay una falla de red después de guardar, actualiza primero para saber si el cambio llegó al servidor.

## Elegir el método de pago

Solo el dueño puede asignar un método en el detalle del pedido:

- **Transferencia bancaria**: preparada como opción, sin cobro ni verificación automática.
- **Efectivo al recoger**: para pedidos que se recogen.
- **Efectivo contra entrega**: para pedidos a domicilio.

Hasta elegirlo, el pedido muestra que la tienda tiene pendiente definir el método. **Guardar método no registra ni verifica dinero recibido**, no envía un enlace de cobro, no cambia el pedido a pagado y no congela precios. El cliente puede ver la opción elegida en su consulta privada y en el resumen de WhatsApp.

Para transferencia hay un **borrador privado de instrucciones**. Solo lo ve el dueño; no se comparte con el cliente ni se envía por WhatsApp. Durante las pruebas utiliza únicamente datos ficticios. Nunca escribas contraseñas, códigos de seguridad o credenciales bancarias. Habilitar instrucciones reales requiere una autorización posterior.

No se puede cambiar el método de un pedido finalizado ni de uno con pago en proceso, registrado como pagado o reembolsado. Todavía no existe un botón para registrar «Pago recibido». La verificación de transferencias, recepción de efectivo y Recurrente requiere un flujo financiero independiente aprobado y comprobado.

Si un registro antiguo aparece como «Pago registrado, sin verificación», no lo uses como comprobante. Una captura de pantalla, un mensaje del cliente o un pedido confirmado tampoco prueban el cobro.

## Comunicarse y cancelar

**Contactar al cliente por WhatsApp** abre una conversación con el número validado; no envía un mensaje automáticamente. Revisa el destinatario y el contenido antes de enviarlo. El cliente conserva su vista previa, enlace y opción de copiar el resumen.

Los estados de mensajes y los de pedidos son distintos. Un resumen de pedido recibido no confirma producción ni pago. Para la integración automática y sus pendientes, consulta la [guía de WhatsApp](whatsapp-automation.md).

Cancelar un pedido no devuelve dinero. Las cancelaciones posteriores al estado recibido pueden exigir una verificación de acceso reciente. Si existe un cobro o una discrepancia, consulta el registro financiero y solicita asistencia antes de prometer un reembolso. No registres una devolución como completada sin evidencia.

## Revisión antes de usarlo con clientes

El dueño debe confirmar los precios, presentaciones, fotografías, teléfono, dirección y horarios de recogida, zonas y condiciones de entrega. No se han inventado datos faltantes. Practica primero el recorrido con datos ficticios, en computadora y teléfono, antes de autorizar cualquier uso real.
