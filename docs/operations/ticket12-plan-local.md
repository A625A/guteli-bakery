# Ticket 12: alcance local autorizado

15 de octubre de 2026. Base local y remota comprobada: `2a73ab5da0edef60af1eabb8a2693f6252b7dd80` en `A625A/guteli-bakery`, rama `main`. `products/` y worktrees ajenos quedan fuera. La instrucción del dueño autoriza mejoras locales no destructivas; prevalece sobre el estado antiguo «no autorizado» del borrador.

## Diseño

1. Reutilizar las respuestas y controles de autorización actuales. Añadir encabezados privados a todo el recorrido de pedidos, checkout y autenticación, incluyendo errores y redirecciones. Los tokens de recibo siguen siendo credenciales portadoras; conocer la referencia pública no autoriza acceso.
2. Registrar únicamente códigos enumerados, fecha y conteos. Nunca serializar errores, peticiones, URLs, cabeceras ni objetos de proveedor. Sustituir el logger de autenticación y desactivar logs automáticos de desarrollo con URLs/argumentos. Los logs del runtime y del futuro proxy requieren verificación separada.
3. Reutilizar el panel actual con estados operativos agregados, protegidos por sesión/rol/MFA. Comprobar base y almacenamiento sin crear/borrar archivos; registrar señales mínimas del worker en PostgreSQL. Pagos y respaldos se muestran pendientes de integración, nunca sanos por falta de evidencia.
4. La conservación es una propuesta. Preparar selección acotada y simulación de limpieza; el código productivo no tiene una ruta de ejecución destructiva. La aplicación de cambios a datos ficticios vive exclusivamente en pruebas. Conservar pedidos, importes, revisiones, auditoría, identificadores de idempotencia y supresiones. Bloquear el borrado previo de callbacks del worker.
5. Probar canarios de datos sensibles, aislamiento entre clientes, fallas de dependencias, sesiones/roles, estados de monitoreo y limpieza repetible. Ejecutar suites unitarias, integración, navegador, typecheck, ESLint y build con una base de pruebas separada.

No publicar, desplegar, contactar proveedores, acceder a Oracle, modificar el hackathon, activar envíos/pagos ni programar limpieza. El monitoreo interno no puede avisar fuera de la tienda cuando la aplicación o la base están totalmente caídas; esa integración requiere autorización posterior.
