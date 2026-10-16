# Monitoreo local del Ticket 12

## Qué ve la dueña

En el panel administrativo existente, **Estado de la tienda** presenta: comprobación de base de datos, errores observados al guardar pedidos, acceso a archivos, notificaciones fallidas/atrasadas o de resultado desconocido, ejecución del worker, pagos y respaldos. Mantiene sesión vigente, rol OWNER/ADMIN y MFA; no muestra SQL, rutas de disco, teléfonos, tokens o errores del proveedor. La actualización usa el mecanismo existente del panel.

- **Necesita atención:** revisar antes de repetir operaciones. Un envío de resultado desconocido no debe reenviarse automáticamente.
- **Sin comprobar:** falta evidencia; no equivale a que todo funcione.
- **Desactivado:** integración apagada o todavía no implementada.
- **Comprobado:** únicamente la comprobación descrita. Acceso a una carpeta no demuestra espacio libre, disco durable ni posibilidad de restaurar.

## Cobertura técnica y límites

- Los fallos de creación de pedidos y respuestas internas emiten códigos fijos. Los contadores de pedidos son **locales al proceso y desde su inicio**; no persisten reinicios ni agregan varias réplicas. No son métricas de ventas, disponibilidad ni éxito de todos los pedidos.
- El logger acepta únicamente un vocabulario cerrado y genera su propia fecha. Descarta nombres de evento ajenos, errores, argumentos, URLs, cabeceras, IDs y cuerpos. Better Auth tiene logger y callback de error seguros. `logging:false` evita las URLs/argumentos y el traslado de logs del navegador que Next.js imprime por defecto en desarrollo.
- `onRequestError` registra un código genérico, sin serializar el error ni el contexto de Next. **No sustituye ni intercepta todos los logs internos de Next, Node, PostgreSQL, adaptadores o el futuro proxy.** Revisar esos componentes antes de producción; los mensajes no capturados por la aplicación y los joins de respaldo del adaptador son riesgos residuales. No se usa un reemplazo global de `console` que ocultaría errores sin control.
- Next 16.3.3 reemplaza `Cache-Control` del HTML en desarrollo por `no-cache, must-revalidate`. Ese modo no certifica `no-store` y solo debe usarse con datos ficticios. `npm run test:privacy` verifica estrictamente el build de producción en localhost; requiere una base local aislada `guteli_test` y la reinicia. No es un comando para una base real.
- `/health` conserva su contrato mínimo y añade no-store/no-referrer/noindex. Prueba conexión a la base, no esquema/respaldos. Los fallos de base se registran sin el error original. Si la base falla por completo, el login y el panel también pueden dejar de funcionar: no se promete acceso al panel durante la caída.
- La consulta protegida usa agregados de ambas clases de notificación (cliente/dueña), observa fallas, resultados ambiguos y pendientes de más de 15 minutos. No carga destinatarios ni payloads en el DTO.
- `operational_checks` contiene como máximo la fila del worker de WhatsApp, con estado fijo y fecha. El proceso escribe al completar el lote o ante excepción; una escritura de monitoreo fallida no provoca un reenvío. Observaciones antiguas no sustituyen las nuevas. Un worker autorizado sin ejecución confirmada por más de diez minutos se marca para revisión. La comparación requiere relojes sincronizados. La señal certifica ejecución del proceso, no entrega de todos los mensajes.
- No se programa ni activa el worker. Cuando se autorice en producción, definir una ejecución al menos cada cinco minutos y comprobar señal fresca, fallas y detenimiento con proveedor simulado antes de conectar uno real.
- La migración `0015_operational_checks.sql` es aditiva. Se ejecutó únicamente en pruebas. Falta aplicarla, con aprobación, en cualquier otro entorno; sin ella, el resumen queda parcial y registra `MONITOR_UNAVAILABLE`.
- Pagos siguen desactivados; no existe verificador para conectar. Respaldos se indican pendientes del Ticket 11. No se inventan estados sanos ni trabajos de respaldo.
- No hay alertas fuera del panel. Un monitor de host/servicio y un canal de aviso gratuitos pueden prepararse posteriormente sobre `/health` y los códigos seguros, pero requieren autorización y configuración del entorno. Nada externo está activado.

## Acciones para soporte

Si falla guardar pedidos, verificar el historial antes de solicitar otro envío. Si falla almacenamiento, suspender cambios de fotos hasta revisar montaje/permisos/espacio. Si hay UNKNOWN, conciliar el identificador del proveedor en el sistema protegido; no reintentar a ciegas. Si falta la señal del worker, revisar el proceso y configuración, manteniendo los envíos apagados hasta resolver la causa.

En producción, el proxy debe excluir las rutas privadas de caché y de logs de acceso con ruta/query, eliminar cookies/Authorization/cuerpos de diagnósticos y sanear cabeceras reenviadas. Comprobar esas reglas en el host real requiere otro permiso; no se accedió a Oracle.
