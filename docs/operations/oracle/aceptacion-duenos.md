# Ticket 04 — Revisión de los dueños

23/10/2026 · Guatemala · **Pendiente de revisión y aprobación de los dueños.**

Este documento reúne la lista de revisión, las decisiones pendientes y los ejercicios. Los resultados técnicos están en el [reporte del Ticket 04](../../../artifacts/oracle-preparation/ticket-04/RESULTADO.md). Aprobar esta revisión no autoriza publicar la tienda ni activar pedidos, cobros o mensajes.

## Cómo hacer la revisión

Revisen juntos el catálogo y las pantallas en computadora y teléfono. Por ahora pueden usar las capturas enlazadas: el entorno anterior de práctica necesita recuperación antes de una nueva sesión interactiva. Las capturas contienen datos ficticios y no prueban ventas ni disponibilidad actual.

Para cada punto anoten uno de estos resultados:

- **Aprobado:** lo revisaron y están de acuerdo; anoten responsable, fecha y qué aprobaron.
- **Pendiente:** todavía falta decidir o revisar.
- **Bloqueado:** no se puede comprobar hasta resolver el impedimento indicado.
- **Requiere corrección:** describan qué está mal y cómo debe quedar.

No marquen aprobado solo porque el sistema lo muestra. No escriban contraseñas, códigos del autenticador, cuentas bancarias ni información de clientes en esta ficha.

## Lista para los dueños

Todas las casillas comerciales siguen abiertas. La evidencia técnica no sustituye su aprobación.

- [ ] Revisamos cada producto: nombre, categoría, descripción, cantidad que incluye, precio en Q y fotografía correspondiente.
- [ ] Resolvimos las cuatro presentaciones pendientes y la imagen de Nuditos.
- [ ] Acordamos qué productos ofrecer, cuáles ocultar y cómo avisar que están agotados. Definimos quién actualiza existencias y capacidad de producción.
- [ ] Decidimos si habrá promociones, sus productos, porcentaje y fechas/horas de Guatemala; o dejamos constancia de que no habrá promociones.
- [ ] Confirmamos contacto, días y horarios de atención, anticipación, recogida y entregas.
- [ ] Acordamos métodos de pago y quién verificará el dinero recibido. Entendemos que seleccionar un método o completar un pedido no demuestra un cobro.
- [ ] Aprobamos condiciones de cambios, cancelaciones, devoluciones, reclamos, privacidad y conservación de información.
- [ ] Designamos quién tendrá acceso de dueño (OWNER) y quién de administrador (ADMIN), con cuentas individuales, autenticador y recuperación privada.
- [ ] Comprendemos que no se puede quitar al último OWNER activo ni desactivar la propia cuenta desde Usuarios.
- [ ] Revisamos navegación, edición, pedidos y usuarios en computadora y teléfono. Cada responsable pudo explicar su recorrido.
- [ ] Reconocemos los cinco pedidos PRUEBA y que no se preparan, entregan ni cobran.
- [ ] Aceptamos que los pedidos ficticios afectan contadores y estadísticas; no representan ventas. No autorizamos borrado automático.
- [ ] Confirmamos que el carrito es demostrativo: no envía pedidos y no abre cobros ni mensajes reales.

**Registro de la revisión:** fecha ___ · responsables (iniciales o cargo) ___ · versión revisada ___ · puntos aprobados ___ · correcciones solicitadas ___ · próxima revisión ___ .

**Resultado comercial actual: PENDIENTE.** No hay firma ni decisión real de los dueños registrada en este ticket.

## Catálogo que requiere aprobación

Transcripción del catálogo inicial existente; **no es una propuesta nueva ni una aprobación comercial**. Los precios provienen del archivo original, no se cambiaron. Los archivos de imagen están disponibles, pero los dueños deben confirmar que representan sus productos y que pueden usarlos.

| Categoría | Producto | Precio actual | Presentación actual | Imagen | Decisión de los dueños |
|---|---|---:|---|---|---|
| Pretzels | Originales | Q60.00 | Bolsa de 5 | [Ver](../../../public/images/products/pretzel-original.webp) | Pendiente |
| Pretzels | Queso y jalapeño | Q75.00 | Bolsa de 5 | [Ver](../../../public/images/products/pretzel-jalapeno.webp) | Pendiente |
| Pretzels | Queso y pepperoni | Q75.00 | Bolsa de 5 | [Ver](../../../public/images/products/pretzel-pepperoni.webp) | Pendiente |
| Pretzels | Tomate y albahaca | Q75.00 | Bolsa de 5 | [Ver](../../../public/images/products/pretzel-tomate-albahaca.webp) | Pendiente |
| Bagels | Originales | Q60.00 | **Por definir** | [Ver](../../../public/images/products/bagel-original.webp) | Pendiente |
| Bagels | Queso y jalapeño | Q75.00 | **Por definir** | [Ver](../../../public/images/products/bagel-jalapeno.webp) | Pendiente |
| Bagels | Queso y pepperoni | Q75.00 | **Por definir** | [Ver](../../../public/images/products/bagel-pepperoni.webp) | Pendiente |
| Bagels | Tomate y albahaca | Q75.00 | Bolsa de 5 | [Ver](../../../public/images/products/bagel-tomate-albahaca.webp) | Pendiente |
| Burger buns | Burger buns | Q55.00 | **Por definir** | [Ver](../../../public/images/products/pan-hamburguesa.webp) | Pendiente |
| Nuditos | Nuditos | Q60.00 | Bolsa de 15 | **Sin fotografía; ilustración identificada como tal** | Pendiente |

La carga inicial deja productos y categorías activos, sin conteo de existencias; eso no significa que los dueños hayan autorizado ofrecerlos. Una existencia vacía significa «sin control», cero significa agotado. No se comprobó el estado actual de una base comercial. No se creó ni aprobó ninguna promoción en este ticket.

## Guía breve para usar el administrador

Se reutiliza la [Guía del dueño](../guia-del-dueno.md), que ya explica ingreso, autenticador, productos, promociones, pedidos, pagos y recuperación. No hay un segundo manual.

Para esta revisión: ingresá en `/admin/login` únicamente en el entorno local que prepare el responsable técnico. En teléfono, abrí **Menú administrativo**. Usá **Productos → Editar** para revisar un artículo, **Categorías** para ordenar el catálogo, **Promociones** para revisar descuentos y **Pedidos → Ver** para abrir un pedido. **Usuarios** solo aparece para OWNER. Al terminar, abrí **Mi cuenta → Cerrar esta sesión**.

Antes de guardar, revisá la presentación y el precio: `60.00` significa Q60.00. Los cambios del catálogo pueden reflejarse inmediatamente en la tienda. Durante el ensayo usá únicamente una copia aislada y ficticia. No edites el catálogo real para practicar.

| Acción | OWNER (dueño) | ADMIN (administrador) |
|---|---|---|
| Revisar resumen; productos, categorías y promociones | Sí | Sí |
| Consultar pedidos, cotizar envío y avanzar estados permitidos | Sí | Sí |
| Crear administradores, cambiar roles o activar/desactivar cuentas | Sí, con verificación reciente | No |
| Elegir método de pago y ver borrador privado de transferencia | Sí | No |
| Registrar un cobro real verificado | Flujo pendiente | Flujo pendiente |
| Usar contraseña propia y autenticador | Obligatorio | Obligatorio |

Si se solicita verificar el acceso nuevamente, volvé a ingresar y completá el autenticador. No compartan cuenta ni códigos. La guía existente explica la recuperación; designar personas reales y guardar sus códigos queda para la sesión autorizada, fuera de este registro.

## Ejercicios con datos ficticios

**Estado de ejecución:** preparados para los dueños; no realizados por ellos. Se reutilizaron pruebas técnicas previas. La nueva regresión de referencias PRUEBA se detalla en el reporte. Antes de una sesión interactiva, el responsable debe disponer de un entorno local aislado; no se debe ejecutar la carga inicial sobre datos reales ni repetir la carga en una base que ya tenga pedidos.

| Ejercicio | Pasos y resultado esperado | Estado de revisión por dueños |
|---|---|---|
| Catálogo y carrito | En Menú, agregá Originales de Pretzels. Cambiá cantidad de 1 a 2: con el precio existente y sin promoción, Q60 pasa a Q120. Recargá y comprobá la cantidad; quitá el producto y comprobá carrito vacío. No debe existir envío de pedido ni cobro habilitado. | Pendiente |
| Editar un producto | En una copia ficticia, abrí Editar, revisá precio, presentación y fotografía. Guardá un cambio de descripción marcado PRUEBA y revisá su reflejo en Menú; recuperá el valor previo. Probá cerrar con cambios sin guardar y leer el aviso. | Pendiente |
| Disponibilidad y categorías | En la copia ficticia, anotá el estado inicial; probá agotado y desactivado. El agotado no se agrega y el inactivo desaparece. Revisá la categoría y devolvé los valores iniciales. | Pendiente |
| Promociones | Revisá las pantallas existentes y explicá porcentaje, productos, inicio y fin. Los descuentos simultáneos no se suman; se usa el mayor vigente. No definan una oferta real para completar el ejercicio. | Pendiente |
| Acceso | Con identidades ficticias, comprobar cambio de contraseña inicial, autenticador y cierre de sesión. ADMIN no ve Usuarios ni puede asignar métodos de pago. El último OWNER no se puede degradar. No probar bloqueo de acceso con la única cuenta real. | Pendiente |
| Pedidos | Buscar las cinco referencias de la tabla siguiente y revisar estado, cantidades y «Pendiente de pago». El pedido completado sigue sin cobro comprobado. Si hay filtro de hoy, quitarlo: son registros históricos del 18/10/2026. | Bloqueado para sesión interactiva; evidencia histórica disponible |
| Computadora y teléfono | Repetir navegación, lectura y edición a 1440 y 390 píxeles o en dispositivos equivalentes. Revisar botones accesibles, textos legibles, menú móvil, cierre de paneles y confirmación al guardar. | Pendiente |

### Los cinco pedidos conservados en el manifiesto

Se verificó el manifiesto del 18/10/2026 y el registro de carga exitosa; **no se consultó una base en ejecución el 23/10/2026**. Los estados son los de creación. Los cinco quedaron sin pago y sin mensajes al cargarlos. Las modalidades provienen del script de práctica existente.

| Referencia ficticia | Estado al crearse | Cantidad | Modalidad |
|---|---|---:|---|
| PRUEBA-1-e1f48d6a | Recibido | 1 | Recogida |
| PRUEBA-2-5ff3deb1 | Confirmado | 2 | Entrega |
| PRUEBA-3-4b07c7bd | En preparación | 3 | Recogida |
| PRUEBA-4-e84991ce | Listo para entregar | 4 | Entrega |
| PRUEBA-5-1d178766 | Completado | 5 | Recogida |

La cantidad indica presentaciones del artículo, no piezas individuales. En esta revisión no se avanzan estados ni se asignan pagos: se conserva el punto de partida. Las referencias PRUEBA ahora son aceptadas por el buscador y las rutas administrativas; la operación interactiva con base sigue pendiente.

Estos registros pueden aparecer en pedidos abiertos, completados y estadísticas del período que incluya su fecha. No existe aquí una exclusión automática de PRUEBA. Las capturas del administrador con 24 pedidos pertenecen a otro conjunto ficticio; no son estos cinco ni ventas reales. Antes de limpiar cualquier conjunto, identificar base y referencias, conservar evidencia y pedir autorización específica para esa limpieza. No hay borrado programado.

## Decisiones comerciales pendientes

| Tema | Qué deben decidir | Responsable propuesto | Estado |
|---|---|---|---|
| Catálogo | Aprobar cada fila, categorías, descripciones, precios, presentaciones y derechos de fotografías; resolver Nuditos. | Dueños | Pendiente |
| Disponibilidad | Productos ofrecidos, conteo o ausencia de conteo, agotados, cupo diario y quién lo mantiene. | Dueños y encargado de producción | Pendiente |
| Promociones | Ninguna o listado aprobado con porcentaje, productos y vigencia en Guatemala. | Dueños | Pendiente |
| Contacto | Confirmar el número ya mostrado en Contacto y quién lo atiende. No se contactó ese número. | Dueños | Pendiente |
| Horarios y anticipación | Días de atención, feriados, hora límite y confirmar los 2 días de anticipación que indica el sitio. | Dueños | Pendiente |
| Recogida y entrega | Lugar autorizado de recogida, horarios, zonas de cobertura, costo o cotización, plazos y excepciones. | Dueños | Pendiente |
| Pagos | Aprobar efectivo al recoger, efectivo contra entrega y/o transferencia; responsables y evidencia de cobro. No guardar información bancaria aquí. | Dueños | Pendiente; verificación real bloqueada |
| Políticas | Cambios, cancelaciones, reembolsos, reclamos, información de ingredientes/alérgenos y conservación de datos. | Dueños | Pendiente |
| Accesos y rutina | Personas OWNER/ADMIN, recuperación privada y frecuencia de revisar pedidos; el panel cerrado no avisa. | Dueños | Pendiente |
| Práctica | Aceptar impacto en estadísticas y acordar conservación o limpieza futura expresamente autorizada. | Dueños y responsable técnico | Pendiente |

## Pantallas existentes para la reunión

- Tienda demo: [carrito en computadora](../../../artifacts/oracle-preparation/demo-cart-1440.png) y [carrito en teléfono](../../../artifacts/oracle-preparation/demo-cart-390.png).
- Administrador integrado: [resumen en computadora](../../../artifacts/admin-ux-2/integration/dashboard-1440.png) y [resumen en teléfono](../../../artifacts/admin-ux-2/integration/dashboard-390.png).
- Formularios: [productos](../../../artifacts/admin-ux-2/after/products-1440.png), [editar en teléfono](../../../artifacts/admin-ux-2/after/product-edit-390.png), [promociones](../../../artifacts/admin-ux-2/after/promotions-edit-390.png) y [usuarios](../../../artifacts/admin-ux-2/after/users-390.png).

Son capturas reutilizadas; ninguna fue tomada como evidencia de aprobación de los dueños. La publicación continúa bloqueada por los problemas de dependencias del Ticket 03, aunque esta ficha llegue a aprobarse.

Las capturas demo y algunos registros históricos se conservan solo en el worktree de preparación. Si un enlace no abre desde main, usar ese worktree para la reunión; no implica que exista una tienda publicada.
