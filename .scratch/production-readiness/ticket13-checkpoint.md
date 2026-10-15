# Ticket 13 — Implementación y validación local

Fecha: 14 de octubre de 2026, Guatemala. Rama: `main`. Base: `19d5ad77660bde855e5fad23c0224634263f54a5`.

## Alcance entregado localmente

- Precios de producto y cotizaciones de envío en Q, convertidos exactamente a centavos enteros; identificadores sugeridos al crear/duplicar, ayudas y confirmación de retiro.
- Los formularios de catálogo y cotización conservan los datos ante errores. Los errores nativos de red no se muestran directamente en inglés.
- Método por pedido reservado al dueño: transferencia bancaria, efectivo al recoger o efectivo contra entrega, según la modalidad. Migración aditiva `0014_owner_payment_method.sql`; pedidos existentes sin método asignado.
- Control de sesión, rol, MFA, origen, versión, concurrencia, estado final y pago en proceso/registrado. La autoridad del dueño se vuelve a comprobar después de esperar el bloqueo del pedido. Auditoría sin instrucciones bancarias.
- Borrador de instrucciones exclusivo del dueño, privado e inactivo. No aparece en consulta del cliente ni en WhatsApp.
- Método visible para cliente y resumen de WhatsApp; cambio de método invalida una vista previa antigua del mensaje. No acredita cobro, congela precios, modifica importes ni dispara notificaciones.
- Detalle separa confirmación operativa, aceptación vigente del total, método y pago. Referencia exacta para buscar, contacto manual validado y fechas en Guatemala.
- Panel con última consulta correcta, actualización al volver a la pestaña, aviso de información sin confirmar y actualización manual. Una respuesta demorada conserva la fecha anterior; si falla la solicitud parcial, Next.js puede recuperar mediante navegación completa y solo entonces mostrar una fecha nueva.
- Controles principales administrativos de al menos 44px de alto y formularios adaptables, conservando paleta y estructura existentes. Guía diaria en español en `docs/operations/guia-del-dueno.md`.

## Validación

| Comprobación                                       | Resultado                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Unitarias completas                                | 263 aprobadas; 2 fallas previas del README                                                     |
| Unitarias focalizadas finales                      | 17 aprobadas (incluidas en las anteriores, no sumar)                                           |
| Integración completa                               | 168 aprobadas, 23 archivos                                                                     |
| Navegador: catálogo, pedidos y panel               | 5 aprobadas                                                                                    |
| Navegador: checkout, recuperación y promociones    | 28 aprobadas                                                                                   |
| Navegador: resumen de WhatsApp, escritorio y móvil | 10 aprobadas; 1 caso exclusivo de modo demostración omitido por la configuración de esta suite |
| Typecheck, ESLint y build                          | Aprobados                                                                                      |
| Diff y formato de archivos del alcance             | Revisados; sin errores de espacios                                                             |

Las dos fallas de `tests/unit/docker-runtime.test.ts` reclaman instrucciones ausentes del README: comandos ordinarios de Docker Compose y requisitos de migración/provisión/secretos. Requieren una corrección documental separada; no se modificó funcionalidad ajena para ocultarlas. Una ejecución unitaria dentro del sandbox también bloqueó sockets de pruebas de salud (`EPERM`); la repetición autorizada con sockets locales dejó únicamente esas dos fallas conocidas.

Se reprodujeron y corrigieron pérdida de ediciones tras error de red y reinicio visual del selector de método después de guardar. Se actualizó la expectativa estricta del recibo para su nuevo campo nullable `paymentMethod`. La prueba del panel distingue respuesta pendiente de recuperación exitosa por navegación completa. Se normalizaron espacios del formato horario para evitar diferencias de hidratación entre Node y Chromium.

Las pruebas verifican, entre otros casos, acceso denegado a ADMIN, revocación de rol durante espera, solicitudes simultáneas (una aceptada y una en conflicto), importes sin cambios al asignar método, datos privados ausentes de respuestas públicas, promoción vencida con recálculo y precios históricos protegidos. Los marcadores de pago en fixtures son sintéticos y no prueban cobros reales.

## Evidencia y reproducción

Harness local: `.scratch/production-readiness/verify-ticket13.py`. Perfiles de base de datos/navegador se ejecutan secuencialmente para no cruzar fixtures. Usar una base de pruebas aislada que cumpla `src/test/database-url.ts`, nunca una base con datos reales.

Logs y capturas fuera de Git: `/private/tmp/guteli-ticket13-harness/`. Capturas actuales: `ticket13-dueno-movil.png` y `ticket13-cliente-movil.png`; contienen únicamente datos ficticios. Inspección visual efectuada. Se comprobó secuencia de teclado y foco, controles principales de 44px, cliente a 390px y detalle administrativo sin desbordamiento a 320/390px.

## Pendientes y límites

- El Ticket 13 no se declara aceptado en su totalidad: faltan aprobación del contenido comercial por el dueño, prueba en teléfono físico, lector de pantalla y revisión completa de contraste/ampliación/accesibilidad.
- La cola de pagos verificados pendientes de reconocimiento y el registro/verificación de dinero requieren sus tickets financieros y decisiones separadas. No se añadió un botón de pago recibido.
- Ticket 01 continúa bloqueado por verificación externa. Pagos, autorización de WhatsApp automático y webhooks permanecen desactivados. No se accedió a Oracle, al hackathon ni a servicios de producción.
- El dueño autorizó posteriormente commit y push de los cambios verificados del Ticket 13 directamente a `main`; la aceptación completa del ticket sigue pendiente. La confirmación del SHA remoto se reporta al finalizar la publicación. `products/` y los otros worktrees se conservaron sin cambios.
- No se inició otro ticket. No se agregaron credenciales, bases locales, capturas ni logs al conjunto publicable.
