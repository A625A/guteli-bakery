# Uso del panel Admin UX 2.0

El panel conserva el acceso con contraseña y autenticador. En celular, abre **Menú administrativo** para cambiar de sección. **Mi cuenta**, en Resumen, permite cerrar la sesión.

## Resumen

Las tarjetas superiores muestran la operación actual, aunque el pedido sea de otro día. Presiona una tarjeta para abrir los pedidos de ese estado.

En **Así van tus pedidos**, elige Hoy, 7, 30 o 90 días, o un rango personalizado, y presiona **Consultar**. Las fechas usan el horario de Guatemala. Hoy todavía está en curso; la comparación utiliza la misma duración transcurrida del período anterior. Cuando no hay pedidos anteriores, se indica que no existe base de comparación.

Los gráficos cuentan pedidos recibidos por su fecha de creación. El estado mostrado es el estado actual de esos pedidos, no el estado que tenían al cierre del día. Los productos y tipos de entrega excluyen pedidos cancelados y pagos reembolsados. Los productos y categorías conservan los nombres y las presentaciones guardadas en el pedido. No se convierten bolsas a piezas ni se completan datos desconocidos. Los rankings muestran hasta 8 productos y 12 combinaciones de categoría y presentación.

Estas estadísticas **no representan ventas cobradas**. Elegir un método de pago tampoco confirma que se haya recibido dinero. El seguimiento operativo y las estadísticas se actualizan por separado; usa Consultar para refrescar los gráficos. En **Estado de la tienda** se conservan las comprobaciones del Ticket 12: un estado Sin comprobar no significa que todo esté bien, y el panel no envía alertas cuando está cerrado.

## Productos y categorías

Busca un producto por nombre, filtra por categoría o estado y presiona **Editar**. Cambia los datos principales y usa **Guardar cambios**. En **Opciones del catálogo** están el enlace, la presentación, el código interno y el orden. La existencia vacía significa Sin control; cero significa agotado. Puedes agregar o cambiar la foto después de crear el producto.

Los editores conservan los datos si falla el guardado y advierten antes de descartar cambios. Si alguien más modificó el registro, vuelve a abrirlo para cargar la versión actual y repite tus cambios.

Desactivar una categoría oculta sus productos activos y pide confirmación. Retirar un producto conserva su historial. No es necesario retirar un producto para ocultarlo temporalmente: puedes desactivarlo.

## Promociones

Abre una promoción desde su tabla. Puedes buscar productos, filtrar por categoría y seleccionar los visibles. Cambiar de filtro conserva la selección. Si contiene productos retirados, el panel permite quitarlos explícitamente antes de guardar. Si se superponen ofertas, se mantiene la regla existente de aplicar solo el mayor descuento.

## Pedidos y usuarios

Filtra pedidos por referencia exacta, estado, modalidad o fecha solicitada. El rango también corresponde a la fecha solicitada, mientras que los gráficos del Resumen usan la fecha en que se recibió el pedido. Abre **Ver** para consultar los productos, cotizar la entrega y cambiar el estado con las reglas existentes.

Usuarios está disponible únicamente para la propietaria. **Agregar administradora** despliega los campos de una nueva cuenta. Los controles del último propietario, MFA y sesiones siguen vigentes.

## Entorno local

El rediseño partió de `2a73ab5`; su integración en main conserva el monitoreo y las protecciones de privacidad del Ticket 12. Las capturas de validación usan únicamente pedidos y cuentas ficticias. No se han instalado dependencias ni creado migraciones nuevas.
