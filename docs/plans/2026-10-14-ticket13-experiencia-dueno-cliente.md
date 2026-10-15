# Ticket 13 — Experiencia del dueño y del cliente

**Estado: implementación local verificada el 14 de octubre de 2026; pendiente de aceptación del dueño y validaciones de accesibilidad indicadas abajo.**

Resultados: `.scratch/production-readiness/ticket13-checkpoint.md`. Guía: `docs/operations/guia-del-dueno.md`. El dueño autorizó posteriormente publicar este alcance verificado en `main`; los servicios permanecen desactivados.

Auditoría del 14 de octubre de 2026, sobre `main` en `19d5ad77660bde855e5fad23c0224634263f54a5`. El commit contiene los ajustes de español; este documento se mantiene local para revisión. Se inspeccionaron componentes, rutas, permisos, datos y pruebas existentes. La validación del panel se hizo en navegador de escritorio; el resumen de WhatsApp también se probó con móvil emulado. Esto no sustituye la aceptación del dueño ni una prueba con lector de pantalla o teléfono físico.

## Límites acordados

- Reutilizar la arquitectura, los formularios y el diseño actuales. La tienda es un sitio web en español de Guatemala, con precios en Q/GTQ y horarios de `America/Guatemala`.
- El dueño decide el método de pago de cada pedido. Elegirlo no acredita que se recibió dinero.
- Conservar precios dinámicos y promociones para pedidos sin pagar, aceptación expresa de cambios de total y precios históricos inmutables de pagos verificados.
- Mantener desactivados pagos, WhatsApp automático y servicios de producción. Oracle y el hackathon quedan fuera de todo acceso o modificación.
- No implementar capacidad diaria: el Ticket 03 fue descartado expresamente. Mantener las fechas solicitadas, el plazo de anticipación, la disponibilidad y las existencias ya existentes.
- No reconstruir funciones que ya trabajan ni convertir pruebas ficticias en evidencia de verificación real.

## Qué existe y qué falta

| Área                     | Funcionalidad existente                                                                                                                                                       | Brecha para una operación sin conocimientos técnicos                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceso                   | Inicio de sesión, cambio inicial de contraseña, autenticador, códigos de recuperación, roles y gestión de usuarios; páginas y mutaciones protegidas.                          | Guía sencilla para ingreso diario y recuperación. Algunos formularios muestran directamente `error.message`, que podría estar en inglés si falla la red; falta normalizar esos errores de interfaz.                                                                                           |
| Productos                | Crear, editar, duplicar como inactivo, desactivar, reactivar y retirar conservando historial; nombre, descripción, categoría, unidad, precio, existencias, destacado y orden. | El precio se escribe en centavos. El identificador del enlace sigue siendo un dato técnico obligatorio aunque ya tenga etiqueta española. Faltan ayudas breves y una revisión clara antes de retirar productos.                                                                               |
| Fotografías y categorías | Carga, vista previa y eliminación de imágenes; validación de formatos/tamaño; categorías y búsqueda paginada al asignarlas.                                                   | Confirmar con el dueño las fotos, unidades de venta y contenido definitivo; mejorar instrucciones solo donde la prueba de uso lo requiera. No se necesita rehacer la carga de imágenes.                                                                                                       |
| Promociones              | Descuento porcentual, inicio/fin en Guatemala, activación, catálogo completo o productos seleccionados; gana el descuento válido mayor, sin acumularse.                       | Explicar al dueño cómo la vigencia afecta pedidos todavía sin pagar; preservar los controles y las reglas actuales.                                                                                                                                                                           |
| Pedidos                  | Listado paginado con filtros por estado, modalidad y fecha; detalle con cliente, entrega, productos, importes, cotización de envío y cambios de estado auditados.             | El envío se captura en centavos. El detalle no reúne claramente estado operativo, aceptación del total y situación del pago. No tiene una acción de contacto al cliente ni búsqueda directa por referencia.                                                                                   |
| Confirmación             | El dueño puede pasar de recibido a confirmado y avanzar por preparación, listo, entrega y completado, con cancelaciones restringidas y control de concurrencia.               | La interfaz debe explicar que confirmar el pedido es aceptar atenderlo, no verificar un pago. El historial muestra estados, pero no sus fechas de forma visible.                                                                                                                              |
| Seguimiento              | Resumen con conteos, pedidos recientes y actualización cada 30 segundos mientras está visible.                                                                                | No muestra última actualización exitosa, error o antigüedad de la información; volver a la pestaña reinicia el temporizador sin actualizar inmediatamente. No hay una cola persistente de pagos verificados pendientes de reconocimiento: depende del Ticket 08 y de la verificación de pago. |
| Cliente                  | Carrito persistente, recuperación del pedido, enlace privado de consulta, cotización, revisión y aceptación del total, promociones y actualización automática de precios.     | Todavía no ve un método de pago elegido por el dueño ni instrucciones asociadas. Debe distinguir con claridad solicitud recibida, confirmación de la tienda, total aceptado y pago pendiente.                                                                                                 |
| Métodos y pagos          | Existe un estado de pago separado del estado operativo; los pagos en línea están desactivados.                                                                                | No hay campo, API ni formulario para asignar método por pedido. Tampoco hay evidencia autoritativa de pago implementada. Las etiquetas actuales «Pagado» dependen del marcador interno; deberán evitar presentarlo como prueba de cobro cuando no haya evidencia.                             |
| WhatsApp                 | Resumen completo, vista previa, enlace manual y copia; integración automática preparada pero desactivada y sujeta a verificaciones externas.                                  | Incorporar el método elegido en los resúmenes cuando exista, sin afirmar pago recibido y sin activar envíos. Mantener todas las restricciones de consentimiento, privacidad y verificación.                                                                                                   |
| Documentación            | Guía de WhatsApp en español y documentación técnica.                                                                                                                          | Falta una guía diaria integral para productos, pedidos, confirmaciones, métodos, problemas de conexión y recuperación de acceso.                                                                                                                                                              |

### Evidencia principal en el repositorio

- Catálogo: `src/components/admin/ProductForm.tsx`, `CategoryForm.tsx`, `PromotionForm.tsx` y `src/server/products/`.
- Pedidos: `src/app/admin/orders/page.tsx`, `src/app/admin/orders/[id]/page.tsx`, `src/components/admin/DeliveryQuoteForm.tsx`, `OrderStatusForm.tsx` y `src/server/orders/update-order.ts`.
- Seguimiento: `src/components/admin/DashboardRefresh.tsx` y `src/server/admin/dashboard.ts`.
- Modelo de datos: `src/server/db/schema/orders.ts` y `order-pricing.ts`; se comprobó que no existe `paymentMethod` ni `payment_method` en el código fuente actual.
- Cliente: `src/components/order/OrderConfirmation.tsx`, `CheckoutPriceReview.tsx`, `CheckoutRecovery.tsx` y `WhatsAppOrderSummary.tsx`.
- Vocabulario y alcance previo: `CONTEXT.md`, `.scratch/production-readiness/issues/13-owner-and-customer-acceptance.md`, tickets 01, 03, 08 y 09.

## Separación de conceptos propuesta

| Concepto          | Quién lo decide o demuestra                                              | Lo que no significa                                                                                         |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Pedido recibido   | El servidor guardó la solicitud.                                         | No confirma producción ni dinero recibido.                                                                  |
| Pedido confirmado | La tienda acepta atender el pedido.                                      | No demuestra pago.                                                                                          |
| Total aceptado    | El cliente aceptó una revisión vigente del precio completo.              | No cobra, no fija permanentemente un precio sin pagar y no sustituye la decisión del dueño sobre el método. |
| Método asignado   | El dueño elige cómo se espera recibir el pago.                           | No cambia el estado a pagado ni congela precios.                                                            |
| Pago verificado   | Evidencia autoritativa del cobro, vinculada al pedido, importe y moneda. | No se deduce de un mensaje, captura de pantalla, método seleccionado o estado operativo.                    |

`CONTEXT.md` conserva una definición antigua de un flujo propuesto de prepago donde confirmar exigía pago verificado. El código actual permite confirmar sin pago, y efectivo al recoger o contra entrega requiere separar ambos conceptos. La implementación actualiza el glosario y los criterios del Ticket 13; no se impondrá silenciosamente una nueva restricción de prepago.

## Plan de implementación propuesto

### 1. Facilitar el catálogo y la cotización

- Capturar precio y envío en quetzales, con hasta dos decimales: por ejemplo, `60.50` se convierte exactamente en 6050 centavos antes de enviarse al servidor, que valida el importe entero. Reutilizar las API actuales, límites, controles de versión y almacenamiento entero; rechazar negativos, desbordamientos y decimales inválidos sin redondeos silenciosos.
- Sugerir el identificador del enlace al crear o duplicar, permitir su edición y explicar su finalidad. Conservar los enlaces existentes y comprobar colisiones; no renombrar productos publicados automáticamente.
- Explicar unidad de venta, disponibilidad y efecto de desactivar o retirar, con confirmación explícita antes de retirar. No añadir controles de capacidad diaria.
- Normalizar errores de conexión y respuestas inesperadas a mensajes españoles útiles, conservando datos del formulario y la posibilidad de reintentar de forma segura.

### 2. Aclarar la gestión y confirmación del pedido

- Presentar por separado el estado del pedido, la cotización completa, la aceptación vigente del cliente y la situación del pago. Mostrar las fechas relevantes en horario de Guatemala.
- Reutilizar las transiciones y permisos existentes; aclarar la acción de confirmar sin cambiar requisitos de cobro. Advertir cuando falte cotizar el envío o el cliente deba aceptar un total actualizado; cualquier nueva regla que bloquee la confirmación requerirá una decisión aparte.
- Añadir búsqueda por referencia y contacto manual al cliente con número validado, sin exponer datos personales en los listados ni enviar mensajes automáticamente.
- Mostrar actualización exitosa, información desactualizada y botón para actualizar; reutilizar la actualización periódica y refrescar al volver a la pestaña. No prometer alertas con el panel cerrado.

### 3. Permitir al dueño asignar el método por pedido

**Opciones aprobadas:** estado inicial «Pendiente de definir» y opciones «Transferencia bancaria», «Efectivo al recoger» y «Efectivo contra entrega». Las opciones de efectivo deben corresponder a la modalidad del pedido. No incluir tarjetas ni enlaces de Recurrente activos.

- Guardar el método como un dato independiente del estado de pago, con fecha, autor del cambio y registro de auditoría. Usar una migración aditiva; los pedidos existentes quedan sin método asignado.
- Reservar la asignación al rol dueño (`OWNER`), conservando los permisos administrativos actuales para las demás operaciones. Validar nuevamente sesión, rol, origen y versión en el servidor; rechazar cambios simultáneos o pedidos finalizados/con pago verificado según las reglas aprobadas.
- Mostrar el método en el detalle administrativo, la consulta privada del cliente y el resumen de WhatsApp. Si no existe, mostrar «Método de pago pendiente de definir por la tienda».
- Para transferencia, preparar instrucciones configurables por el dueño dentro del entorno protegido, sin inventar banco, cuenta ni destinatario. Usar únicamente datos ficticios en pruebas. No habilitar instrucciones reales de cobro ni solicitar credenciales bancarias en esta etapa.
- Elegir o cambiar el método nunca debe marcar `PAID`, generar confirmación de pago, crear enlaces de cobro ni congelar precios. Conservar las revisiones dinámicas y la aceptación explícita de cambios del total.
- No añadir un botón «Pago recibido» en este alcance. La verificación bancaria, el registro de recepción de efectivo y la verificación de Recurrente requieren un flujo de conciliación y evidencia aprobado por separado. La pantalla debe decir «Pendiente de pago» o indicar la falta de verificación cuando corresponda.

### 4. Validar la experiencia y documentar la operación

- Guía en español con tareas concretas: ingresar, recuperar acceso, mantener productos/fotos/promociones, cotizar envío, confirmar un pedido, elegir método, consultar aceptación del total y contactar al cliente.
- Explicar cancelación frente a devolución: cambiar el estado del pedido no devuelve dinero. Escalar devoluciones y discrepancias al flujo financiero pendiente.
- Validar escritorio y móvil, teclado, foco, avisos accesibles, ampliación, contraste, controles táctiles y ausencia de desbordamientos. Registrar los límites de la emulación y revisar con el dueño el flujo real antes de darlo por aceptado.
- Confirmar precios, presentaciones, fotos, contacto, dirección/horarios de recogida y promesas de entrega con el dueño antes de publicar esos datos. La aprobación del plan no inventa ni aprueba ese contenido comercial.

## Pruebas y criterios de aceptación

1. Unitarias: conversión exacta Q/centavos; etiquetas y fallas en español; compatibilidad método/modalidad; método elegido no implica pago; no atribuir cobro a marcadores sin evidencia.
2. Integración: permiso exclusivo del dueño para asignar método, protección de origen/MFA, concurrencia y auditoría; migración de pedidos existentes; cambio de método sin alteración del pago ni del precio histórico; promoción expirada y nueva aceptación de total.
3. Navegador: crear/editar/duplicar/retirar producto, imagen y cotización en Q; confirmar pedido sin declarar cobro; asignar método y verlo como cliente; enlace/copia de WhatsApp sin envío; recuperación ante errores y uso móvil/teclado.
4. Regresión: mantener carrito, checkout, promociones, aceptación del total, historial, autenticación y WhatsApp manual. Typecheck, ESLint y build deben pasar.
5. Separar las dos fallas ya conocidas del README de los resultados del Ticket 13; no alterar funciones ajenas ni ocultar fallas. Su arreglo sigue siendo un trabajo documental separado.

## Dependencias y frontera de entrega

Los pasos anteriores pueden desarrollarse localmente tras aprobación. El pago verificado, los pedidos pagados pendientes de reconocimiento y sus confirmaciones automáticas siguen dependiendo de los Tickets 01/05/08 y de la habilitación externa de WhatsApp; no se marcarán completos con datos ficticios. El criterio antiguo de controles de capacidad del Ticket 13 debe retirarse del plan ejecutable para respetar la decisión del Ticket 03.

La aprobación recibida autoriza implementar y probar este alcance local. No autoriza despliegues, pagos, mensajes reales, acceso a Oracle, cambios al hackathon ni activaciones de producción. La instrucción posterior del dueño sí autoriza publicar los cambios verificados en GitHub, directamente en `main` para este ticket. Cualquier decisión comercial nueva se consultará de una en una antes de realizar el trabajo dependiente.
