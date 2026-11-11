# Guía del dueño de Güteli

Esta guía describe las funciones preparadas localmente. La tienda mantiene los pagos en línea y los mensajes automáticos de WhatsApp desactivados. No se ha autorizado un despliegue de producción. Todos los importes de pedidos están en quetzales y los horarios se muestran para Guatemala.

## Ingresar y proteger el acceso

1. Abre el panel administrativo e ingresa tu correo y contraseña.
2. Si es tu primer ingreso, cambia la contraseña temporal y configura el autenticador.
3. Guarda los códigos de recuperación fuera del navegador, en un lugar privado. No los compartas por WhatsApp ni en chats de soporte.
4. Usa el autenticador en cada acceso que lo solicite. Si lo pierdes, usa un código de recuperación; si tampoco tienes los códigos, solicita asistencia al responsable técnico. No desactives las protecciones ni compartas la cuenta.
5. Cierra sesión cuando termines, especialmente en una computadora compartida.

El cliente elige el método de pago al pedir. Solo el dueño puede cambiarlo, registrar dinero recibido o registrar una devolución. Un administrador puede atender productos y pedidos; no puede verificar cobros.

## Revisar el día

En **Resumen** puedes ver pedidos por atender, productos agotados y notificaciones que requieren seguimiento. La última consulta correcta aparece con fecha y hora de Guatemala. El panel intenta actualizarse cada 30 segundos mientras está visible y al volver a la pestaña.

Si aparece un aviso de información sin actualizar, revisa la conexión y pulsa **Actualizar panel**. No tomes un dato antiguo como confirmación de que no hay pedidos nuevos. Con el panel cerrado no se reciben alertas; la tienda debe acordar una rutina de revisión. Un mensaje aceptado por el proveedor no significa entregado, y ninguno de esos estados demuestra un pago.

En **Estado de la tienda**, «Necesita atención» indica un problema que conviene revisar; «Sin comprobar» significa que falta evidencia. Si hubo errores al guardar, busca el pedido antes de pedir al cliente que lo envíe otra vez. Si un mensaje tiene resultado desconocido, no lo reenvíes hasta aclararlo. La verificación manual de pagos está preparada; el correo de respaldo requiere configuración externa y una prueba autorizada. Consulta la [guía de monitoreo](monitoreo-local.md) para pedir apoyo técnico.

Los enlaces privados de pedidos no deben publicarse. Atiende las solicitudes de corrección o eliminación según el [procedimiento de privacidad](privacidad-conservacion.md); la política de limpieza aún necesita aprobación y no está activada.

El enlace privado permite consultar y aceptar el método y total de ese pedido, incluso después de vencer la sesión inicial de checkout o desde otro navegador. Quien reciba ese enlace tendrá esa misma capacidad: no lo publiques ni lo reenvíes a terceros. No permite registrar cobros; eso sigue reservado al dueño con sesión y MFA.

## Mantener productos y promociones

- En **Productos**, crea o edita nombre, categoría, descripción y presentación. En **Unidad de venta**, escribe lo que se compra: por ejemplo, «bolsa de 5 unidades».
- Escribe el precio en quetzales: `60.50` significa Q60.50. Usa punto decimal y como máximo dos decimales. No escribas `6050` para representar Q60.50.
- El identificador del enlace se sugiere al crear o duplicar. Puedes corregirlo antes de guardar; usa letras sin tildes, números y guiones. No cambies un identificador publicado sin considerar los enlaces que otras personas guardaron. Si ya existe, el formulario lo rechazará para que elijas otro.
- Una existencia vacía significa que no llevas un conteo. Cero indica agotado. Este control no es una reserva ni un límite de producción diaria.
- Desactivar oculta el producto sin retirar su historial. Para retirar un producto, marca la confirmación y luego pulsa **Retirar producto**. Los pedidos históricos se conservan.
- Duplicar crea una copia inactiva para revisarla antes de ofrecerla. No convierte la copia en un producto publicado automáticamente.
- Usa **Agregar fotografía** al crear o editar: JPEG, PNG o WebP de hasta 8 MB. Revisa la vista previa y pulsa **Crear producto** o **Guardar producto** para aplicarla. Se guarda una fotografía; seleccionar otra reemplaza la actual al guardar. **Quitar fotografía seleccionada** descarta la nueva selección. **Quitar fotografía actual** prepara su eliminación; puedes deshacerla con **Conservar fotografía** antes de guardar.
- Si aparece que los datos se guardaron pero la fotografía falló, revisa el mensaje y reintenta sobre el mismo producto. Si se perdió la conexión, recarga primero para comprobar el resultado; no crees otro producto.
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

## Método elegido y cobro verificado

El cliente elige **Transferencia bancaria** para recogida o entrega, **Efectivo al recoger** para recogida o **Efectivo contra entrega** para entrega. El método aparece en el detalle y en su página privada. Elegirlo no cobra, no verifica dinero ni conserva descuentos vencidos.

El dueño puede cambiarlo mientras el pedido siga abierto y sin pago. Un cambio invalida la aceptación anterior: el cliente deberá revisar el método nuevo y aceptar el total vigente en su página privada. Quedan registrados tanto el cambio como la nueva aceptación. Los pedidos antiguos pueden tener el método pendiente; deben coordinarlo y obtener esa aceptación antes del cobro.

El **borrador privado de instrucciones** de transferencia solo lo ve el dueño. No se publica ni se comparte automáticamente, aun después de confirmar el pedido. Coordina las instrucciones aprobadas con el cliente después de confirmar el pedido. Durante las pruebas utiliza datos ficticios. Nunca escribas contraseñas, códigos de seguridad ni credenciales bancarias.

Para registrar un cobro:

1. Confirma el pedido. Cotiza el envío si hace falta y comprueba la aceptación vigente del método y total.
2. Si es transferencia, comprueba el abono real en el banco. Una captura o afirmación del cliente no basta.
3. Si es efectivo, cuenta el dinero ya recibido durante la recogida (pedido listo) o entrega (en camino). No registres anticipadamente dinero prometido.
4. En **Marcar pago como recibido**, escribe el importe exacto en Q y marca la confirmación explícita de recepción. La referencia interna opcional debe ser breve, sin credenciales, cuentas completas ni datos personales.
5. Guarda y revisa el historial. Se conserva importe/GTQ, método, fecha, dueño responsable, revisión aceptada y estados anterior/nuevo. Los cobros requieren MFA reciente; si se solicita, vuelve a ingresar.

Un importe incorrecto, método cambiado, total sin aceptar, pedido cancelado o versión antigua impide verificar. Si se pierde la conexión, utiliza **Reintentar el mismo registro**; conserva la misma clave y los mismos datos. Para corregir un intento rechazado, actualiza el pedido antes de volver a llenarlo. Una nueva clave no permite registrar el mismo pago dos veces.

Los cobros verificados congelan los precios de ese pedido, incluso después de un reembolso. Los registros antiguos que digan **Pago registrado, sin verificación** no constituyen evidencia de cobro y no se convierten automáticamente en verificados.

## Comunicarse y cancelar

**Contactar al cliente por WhatsApp** abre una conversación con el número validado; no envía un mensaje automáticamente. Revisa el destinatario y el contenido antes de enviarlo. El cliente conserva su vista previa, enlace y opción de copiar el resumen.

Los estados de mensajes y los de pedidos son distintos. Un resumen de pedido recibido no confirma producción ni pago. Después de guardar el pedido, el cliente tiene **Enviar pedido por WhatsApp** como acción principal. El resumen omite nombre, teléfono, dirección y notas; identifica el pedido por su referencia. Debe pulsar Enviar en WhatsApp. Abrirlo, copiar el resumen o cerrar la página no confirma envío, recepción ni pago. El código de automatización Meta permanece deshabilitado para un posible uso futuro.

Cancelar un pedido no devuelve dinero ni borra el cobro. Las cancelaciones posteriores al estado recibido pueden exigir una verificación de acceso reciente. Si hay cobro verificado, aparece el aviso de devolución pendiente. Acuerda y realiza la devolución completa fuera del sitio y solo después usa **Registrar devolución realizada**: importe exacto y confirmación de que el dinero ya se devolvió. El sitio no inicia transferencias. No hay devolución parcial ni excepción para cobrar pedidos cancelados; cualquier discrepancia necesita revisión fuera de este flujo.

## Correo de respaldo

Cada pedido guardado encola un aviso al dueño dentro de la misma transacción. Si falla el proveedor, el pedido sigue disponible. El resumen muestra avisos fallidos y enlaces para abrir los pedidos afectados; el detalle distingue el correo de otros canales y muestra los errores. La aceptación por el proveedor no garantiza llegada a la bandeja. Revisa el panel aunque no haya llegado correo ni WhatsApp.

El correo permanece deshabilitado hasta configurar remitente verificado, destinatario aprobado, proveedor, credenciales y prueba autorizada. Consulta [configuración y diagnóstico del correo](owner-email.md).

## Revisión antes de usarlo con clientes

El dueño debe confirmar los precios, presentaciones, fotografías, teléfono, dirección y horarios de recogida, zonas y condiciones de entrega. No se han inventado datos faltantes. Practica primero el recorrido con datos ficticios, en computadora y teléfono, antes de autorizar cualquier uso real.
