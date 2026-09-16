# Guteli — tarifas de entrega por ubicación

Fecha: 2026-09-16. Estado: flujo y tarifas aprobados en conversación; especificación escrita pendiente de revisión del usuario. No implementado ni activado.

## 1. Alcance aprobado

El cliente escribe su dirección, confirma un punto en el mapa y recibe una tarifa calculada por el servidor. La dirección libre no determina por sí sola una tarifa. El cliente no selecciona un precio.

- Q10 (1000 centavos de GTQ): Carretera a El Salvador hasta el km 35 inclusive; también Fraijanes, Sausalito y Pavón.
- Q35 (3500 centavos de GTQ): zonas 1, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16 y 17 de la Ciudad de Guatemala. El mismo número de zona en otro municipio no entra por coincidencia de nombre.
- Fuera de cobertura, dirección no encontrada, coincidencia ambigua, conflicto entre dirección y punto, límite dudoso o servicio no disponible: envío por confirmar con el dueño, sin tarifa cero ni total definitivo.
- Retiro conserva envío cero y total igual al subtotal.

La frase del usuario fue: «toda carretera y fraijanes, sausalito y pavon, y en carretera hasta el km35». El límite kilométrico se aplica al corredor de Carretera a El Salvador, no convierte toda la cobertura en un círculo de 35 km ni excluye automáticamente los lugares nombrados por separado.

Esta ampliación sustituirá únicamente la regla de la especificación del backend de 2026-08-27 que mantiene todos los pedidos de entrega sin cotizar. El resto del contrato de pedidos, seguridad, inventario, recibos y pagos se conserva. Pagos permanece desactivado; calcular una tarifa no es cobrar dinero.

## 2. Texto y experiencia del cliente

Texto compacto aprobado:

- «Carretera a El Salvador: Q10».
- «Áreas seleccionadas de la capital: Q35».
- «Otras ubicaciones: consultar envío».
- Ayuda: «Confirma tu ubicación para conocer el costo de envío».

La cobertura detallada se muestra en una ayuda expandible, no como lista extensa en el formulario. Esa ayuda explica el km 35 y Fraijanes, Sausalito y Pavón; no promete Q10 a cualquier lugar que tenga “carretera” en su nombre.

El mapa se carga únicamente al solicitar entrega y usar la búsqueda/ubicación. El cliente busca una dirección, elige un resultado y confirma el punto. Puede corregir el marcador y conservar referencias escritas; cualquier modificación invalida la cotización anterior. No se solicita GPS automáticamente. Debe existir una alternativa accesible de dirección escrita y contacto con el dueño si el mapa no puede utilizarse.

Mientras se busca o recalcula, no se presenta la tarifa anterior como vigente. Una respuesta atrasada no sustituye la cotización de una dirección más reciente. Para cobertura válida se muestra subtotal, envío y total antes del envío del pedido. Para revisión manual se permite conservar/enviar la solicitud con subtotal y «Envío por confirmar», sin afirmar un total definitivo ni prometer cobertura.

## 3. Geometría de cobertura

Se emplean polígonos/multipolígonos GeoJSON versionados y evaluados en el servidor. No se usa un radio desde la tienda, distancia en línea recta ni expresiones regulares sobre el texto de la dirección para conceder una tarifa.

Cada área contiene identificador estable, etiqueta, tarifa en centavos, geometría, procedencia/licencia y versión de cobertura. La geometría debe representar el área comercial acordada; los límites administrativos son material de referencia, no prueba automática de cobertura comercial.

El corredor hasta km 35 y las áreas de Fraijanes, Sausalito y Pavón requieren una vista de validación antes de activar tarifas reales. La regla comercial queda definida en este documento, pero no se han obtenido ni aprobado coordenadas de contorno. No se inventarán rectángulos, radios laterales o coordenadas para hacer pasar una prueba. Los polígonos sintéticos solo se usan en pruebas y nunca se publican como cobertura real.

La validación de datos rechaza geometrías inválidas, coordenadas no finitas/fuera de rango y solapamientos entre tarifas distintas. En ejecución, una coincidencia múltiple incompatible o un punto exactamente en un límite no resuelto va a revisión manual. El punto del km 35 se incluye en el contorno aprobado; “después del km 35” no recibe Q10 por pertenecer al corredor. Un área nombrada y aprobada por separado mantiene su propia cobertura.

## 4. Mapa y búsqueda: propuesta técnica

Se propone Leaflet para el mapa y Geoapify para cartografía y búsqueda de direcciones. La búsqueda se limita a Guatemala y da preferencia a la región de cobertura; un filtro de país no se considera validación suficiente de la dirección. La calidad de las coincidencias debe comprobarse con direcciones de referencia de cada área antes de la activación.

Esta selección es una propuesta para la revisión escrita, no autorización para crear una cuenta, comprar un plan ni activar facturación. Se usarán claves del negocio únicamente después de que el usuario confirme el proveedor. Clave de búsqueda solo en servidor; clave de cartografía pública separada y restringida conforme a las capacidades del proveedor. No se incrusta una clave privada en NEXT_PUBLIC ni en registros. Atribuciones visibles y aviso de privacidad sobre el proveedor.

La implementación y sus pruebas pueden usar respuestas falsas. Sin configuración válida, proveedor confirmado y cobertura validada, la búsqueda automática queda desactivada y la solicitud sigue funcionando por cotización manual. No se emplea el Nominatim público como autocompletado o reemplazo oculto.

Referencias consultadas:

- https://apidocs.geoapify.com/docs/maps/ — cartografía y requisito de clave.
- https://www.geoapify.com/geocoding-api/ — búsqueda estructurada y filtros.
- https://www.geoapify.com/ — integración con Leaflet y almacenamiento de resultados.
- https://operations.osmfoundation.org/policies/nominatim/ — restricciones del servicio público.
- https://turfjs.org/docs/api/booleanPointInPolygon — comprobación de punto en polígono.

## 5. Cálculo y contrato del servidor

Un módulo separado de cobertura contiene la clasificación pura de coordenadas y el catálogo de áreas. Otro módulo adapta búsqueda de direcciones. El formulario consume endpoints propios de búsqueda y cotización, no credenciales privadas ni un importe aceptado como autoridad.

La cotización produce uno de dos resultados: tarifa calculada con área/versión, o revisión manual con un motivo seguro. La respuesta no incluye errores crudos del proveedor. El servidor emite una cotización firmada de diez minutos ligada a dirección normalizada, punto confirmado, resultado y versión de cobertura. Cambiar cualquiera de esos datos requiere recalcular. La firma usa un secreto de propósito exclusivo.

La solicitud de pedido puede incluir la referencia firmada de cotización y el punto confirmado, pero sigue rechazando precios, subtotal, envío y total elegidos por el navegador. El servidor verifica firma, asociación y vigencia, y recalcula la tarifa con la versión activa antes de crear el pedido. Una cotización vencida o cobertura modificada se devuelve al formulario para recalcular y revisar; no se cambia el precio silenciosamente. Las solicitudes sin cotización siguen admitiéndose como entrega pendiente de cotización manual, preservando clientes existentes y fallos de mapa.

La identidad de idempotencia incluye los nuevos datos normalizados de entrega. Un reintento idéntico ya aceptado devuelve el pedido persistido aunque entretanto venza la cotización o cambie la cobertura; no recalcula ni vuelve a descontar inventario. Un cambio de dirección/punto bajo la misma clave conserva el conflicto de idempotencia existente. La cotización se verifica fuera de la transacción de inventario; no hay llamadas a mapas durante bloqueos de la base de datos.

El punto es una declaración del cliente, no prueba de dónde vive. Si las referencias verificables de dirección y punto discrepan, se deriva al dueño; no se promete impedir que una persona declare deliberadamente una dirección falsa.

## 6. Persistencia, dueño y privacidad

El pedido guarda la dirección original permitida por el contrato, coordenadas confirmadas cuando existen, área/versión aplicada, origen automático/manual y tarifa/total efectivos. No se persiste la respuesta completa del proveedor. Una migración añade los campos mínimos de ubicación y procedencia, sin reescribir tarifas históricas. Los pedidos anteriores continúan válidos con los campos nuevos vacíos.

El dueño ve teléfono, dirección, enlace al punto y tarifa aplicada o «Por confirmar». Los mensajes automáticos usan el mecanismo de WhatsApp ya existente y su configuración desactivada por defecto; la nueva funcionalidad no activa WhatsApp. El enlace de mapa se genera desde coordenadas validadas, nunca desde una URL arbitraria enviada por el cliente. No contiene teléfono, notas, recibos ni tokens de administración.

La cotización manual existente sigue protegida por autorización, control de versión y auditoría. Cambiar una tarifa no altera paymentStatus. Los datos de ubicación se incorporan a la misma anonimización de PII que el resto del pedido, incluido el límite de retención del plan de operaciones. Los registros/auditoría no copian direcciones, coordenadas ni cotizaciones firmadas. Respuestas de búsqueda y cotización usan private,no-store.

## 7. Seguridad y fallos

Los endpoints tienen validación estricta, límites de tamaño, limitación de solicitudes y protección de origen acorde al backend. El proveedor usa un destino HTTPS fijo permitido, sin URLs arbitrarias del cliente ni redirecciones; timeout y respuesta limitados. Las direcciones se envían al proveedor solo como parte de una acción de búsqueda/confirmación explícita, sin nombre, teléfono, notas o carrito.

No encontrar una dirección, agotar cuota o perder conexión no impide hacer una solicitud para cotización manual y no convierte una entrega en gratuita. La caída de la cartografía tampoco elimina los datos escritos ni vacía el carrito. Las pruebas no llaman a proveedores reales ni crean cuentas.

## 8. Verificación y activación

Pruebas de unidad: Q10/Q35, fuera de área, zonas homónimas de otro municipio, contornos/huecos, conflicto entre tarifas, geometría inválida, punto de km 35 y más allá usando referencias validadas. Las pruebas sintéticas demuestran el algoritmo; las referencias geográficas demuestran la cobertura, y no son intercambiables.

Pruebas de API/integración: importe adulterado, firma/punto/dirección alterados, caducidad, cambio de versión, repetición idempotente después de caducidad, atomicidad de inventario, cotización manual, proveedor desactivado/caído y pagos siempre desactivados.

Pruebas del navegador: dirección y marcador, cambio de dirección, respuesta atrasada, rechazo de GPS, mapa no disponible, alternativa accesible, texto corto, total correcto y datos necesarios en administración/notificación sin fugas públicas.

Secuencia: revisar esta especificación; preparar el plan de implementación; implementar y revisar con proveedor falso; validar los contornos reales en una vista de mapa; configurar el proveedor autorizado; ejecutar comprobaciones de cobertura y activar explícitamente. La publicación/despliegue conserva su autorización separada. No se declara terminada la cobertura automática mientras dependa de contornos o configuración sin validar.

Fuera de alcance: optimización de rutas, seguimiento del repartidor, cobro por distancia, precios dinámicos, editor cartográfico general en administración y activación de pagos.
