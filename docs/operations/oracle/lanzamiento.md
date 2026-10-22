# Catálogo, cuentas y transición comercial

## Catálogo real aprobado

No se considera aprobado el seed existente ni `products/` del checkout principal. Antes de publicar, los dueños revisan por producto: nombre/descripción, precio GTQ, fotografía y derechos de uso, presentación/unidad, disponibilidad y stock. También horarios, contacto, dirección de recogida, zonas/costos de entrega y políticas comerciales. Registrar aprobación y fecha, sin inventar información ausente. No mostrar artículos de práctica como catálogo real.

El catálogo público se lee desde PostgreSQL; los cambios autorizados del administrador deben verse al recargar. Probar crear/editar/archivar producto, categoría y promoción, y carga de imagen persistente. Que el panel actualice no es prueba de que una imagen sobreviva a reinicio: comprobar ambas cosas. No usar `npm run db:seed` para sustituir información del dueño.

## Cuentas

Propietarios OWNER, desarrollador ADMIN. Sin acceso a Console por administrar catálogo. No cuentas compartidas ni contraseñas entregadas en chat. Con autorización, primer OWNER mediante CLI interactivo `npm run owner:create` en tools container y entorno privado; no pasar contraseña como argumento/env. Debe negar creación si ya existen cuentas; revisar su resultado.

El OWNER configura contraseña propia, MFA TOTP y recuperación segura al primer acceso, y crea otros usuarios con el flujo existente. ADMIN recibe sólo permisos existentes. Probar que no puede elevarse a OWNER ni quitar el último propietario. Guardar recuperación MFA fuera del servidor por mecanismo privado aprobado; comprobarla con una cuenta de ensayo. Si todos pierden acceso, identificar al dueño y seguir recuperación del proveedor/auth existente con autorización; **no desactivar MFA ni editar roles directamente en SQL** para resolverlo rápido. Una restauración de DB no reemplaza las claves estables necesarias para descifrar/procesar credenciales.

## Cinco pedidos PRUEBA sin datos reales

El CLI `scripts/oracle/practice-orders.ts` no es una ruta web. Simulación:

```sh
node --import tsx scripts/oracle/practice-orders.ts
```

Aplicación requiere cuatro condiciones: autorización `GUTELI_PRACTICE_AUTHORIZATION=guteli-practica-v1`, banderas comercial/pagos/WhatsApp exactamente false, comentario de base `guteli-demo-fixtures-v1` puesto por el operador tras aprobación y **cero pedidos existentes**. Además necesita al menos dos productos revisados y una ruta absoluta nueva para `GUTELI_PRACTICE_MANIFEST` (fuera de Git). El script nunca activa proveedores ni inserta trabajos de notificación.

La marca de base es deliberada y no debe colocarse en una base comercial. Revisar `SELECT current_database()`/host, inventario de pedidos, datos legítimos y backup antes de autorizarla. No se incluye un comando que marque automáticamente cualquier base. Si ya hay pedidos, el script rechaza todo; no borrarlos para satisfacer la guarda.

Cada fixture tiene referencia/nombre `PRUEBA`, teléfono literal `PRUEBA-SIN-TELEFONO` no enrutable, ubicación textual ficticia y nota «NO PREPARAR NI COBRAR». Cubre RECEIVED, CONFIRMED, PREPARING, READY, COMPLETED; recogida/entrega, dos productos y cantidades 1–5. Todos quedan UNPAID; completado no significa dinero recibido. No se genera URL pública de recibo utilizable. El manifiesto enumera UUID, referencias y productos dependientes; catálogo/cuentas existentes no se borran. Los totales ficticios pueden afectar analytics durante práctica: interpretar el panel sólo como ensayo hasta retirarlos.

No ejecutar esto sobre Oracle durante esta tarea. Para usarlo allí más adelante, aprobación específica y tools container; no dar acceso CLI a visitantes. Entrenar al dueño con las mismas restricciones MFA/roles.

## Retirar fixtures antes del primer pedido real

1. Cerrar operaciones comerciales y detener escritores durante ventana aprobada. Inventariar por UUID del manifiesto, prefijo y nota; ninguna heurística por nombre basta por sí sola.
2. Enumerar dependencias: order_items, pricing_revisions/state, historial/auditoría, idempotency, receipts, WhatsApp consent/outbox/deliveries, referencias operativas que aparezcan durante la práctica. Comparar FK reales con schema actual. El manifiesto inicial incluye sólo orders/items, no promete ausencia de dependencias futuras.
3. Preservar catálogo, imágenes y todas las cuentas legítimas. Backup cifrado DB+imágenes y restauración aislada verificada antes de proponer limpieza.
4. Elaborar **plan de cambios sin ejecutar**, con conteos/UUID y orden de dependencias. Mostrar qué se preserva y cómo comprobar integridad. No se entrega comando automático de borrado.
5. Probar el plan en una restauración aislada; verificar FK, catálogo, usuarios/MFA, analytics y cero fixtures restantes. Si algo no coincide, cancelar.
6. Revisión y autorización expresa del dueño para el conjunto concreto de cambios reales. Ejecutarlo sólo en una tarea futura; validar y registrar resultado.
7. Recuperación: volver a la copia validada en entorno aislado, comparar y decidir recuperación real autorizada; nunca sobrescribir producción automáticamente.

Alternativa más aislada: base comercial nueva **en la misma VM**, trasladando únicamente catálogo/cuentas aprobadas y conservando la base de práctica privada. No cambia infraestructura, pero sí el procedimiento acordado; requiere decisión del dueño antes de sustituirlo.

## Go/no-go

La demo no equivale a tienda comercial activa. Antes de abrir pedidos reales: catálogo/políticas aprobados, fixtures retirados, Admin UX/Ticket 12 integrados en SHA final, suites completas, ARM64/contenerización, persistencia/reboot, cuota/costos, HTTPS y autenticación comprobados, respaldo y restauración aceptados, alertas efectivas y RPO/RTO revisados. Payments/Recurrente y WhatsApp automático necesitan sus propias dependencias y autorizaciones; no se activan con este trabajo.

`COMMERCIAL_ORDERS_ENABLED` sólo acepta `true` explícito para habilitar handlers; ausente/otro valor bloquea. Compose lo fuerza false. Las suites de regresión checkout optan a true sólo con datos ficticios. Para lanzamiento futuro hay que revisar o retirar el bloqueo Compose de forma deliberada, reconstruir/revalidar si cambian `NEXT_PUBLIC_*`, actualizar mensajes, metadatos robots y X-Robots-Tag de Caddy/proxy, y aprobar indexación separadamente. Ninguna bandera sustituye la aceptación comercial ni habilita un proveedor de pago no implementado.

## Autorizaciones exactas aún necesarias

- Crear VM/red/volúmenes/IP independientes y cualquier permiso/clave real en la tenancy elegida, tras comprobar cuota/costo.
- Commit/publicación de archivos revisados y selección de SHA de instalación; esta entrega no los hace.
- Acceso SSH, instalación/actualización de software y configuración de firewall del nuevo servidor.
- Inicialización y migraciones SQL concretas sobre la base nueva; provisión de OWNER/ADMIN reales.
- Catálogo/fotos/contacto/políticas aprobados; carga y posterior limpieza de fixtures reales de entrenamiento por separado.
- Registro de subdominio, cambios DNS, emisión TLS y publicación de demo por enlace.
- Registro/configuración de monitoreo y contactos, envío de pruebas de correo, habilitación de timers y ventana semanal.
- Retiro manual de copias al alcanzar retención, restauración sobre datos reales o cambio a base comercial nueva.
- Apertura de pedidos, indexación y eventualmente pagos/WhatsApp: autorizaciones futuras independientes, fuera de esta instalación demo.
