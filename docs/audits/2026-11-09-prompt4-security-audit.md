# Prompt 4 — auditoría de seguridad y correcciones locales

Fecha: 2026-11-09, America/Guatemala. Alcance: autenticación existente y checkout, cobros manuales, enlaces privados, WhatsApp, correo/outbox, función programada de Netlify y migración 0017 entregados en Prompt 2.

## Preservación y checkpoint previo

- `main` permaneció en `3d6af9773f3610d2a2e05bd5aabc8c6b4d97e76b`.
- Checkpoint de Prompt 2: **`06c63b345b39bba1616e80c24b5a4fe6501c696c`**, referencia local **`main-prompt2-checkpoint-20261109T160756Z`**.
- Se inventariaron 107 archivos modificados/no rastreados con tamaño y SHA-256 antes de modificar código. El checkpoint contiene los 85 archivos de código, pruebas, configuración y documentación de Prompt 2.
- Se utilizó un índice temporal y `commit-tree`; no se movió `main`, no se modificó el índice original ni se ejecutaron hooks de commit. La referencia mantiene el commit alcanzable localmente.
- Los 22 archivos ajenos al alcance —fotografías, capturas, evidencia de revisión y auditorías previas— conservaron sus hashes. La migración 0017 conserva exactamente los mismos bytes que el checkpoint.
- Las correcciones de esta auditoría permanecen en el árbol local para revisión. No hubo push, despliegue, migración de Neon, cambios de producción, envíos reales ni edición de credenciales operativas.

## Límites de confianza revisados

| Actor / activo                   | Control revisado                                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navegador anónimo y carrito      | Contratos estrictos, precios calculados por servidor, idempotencia y límites de entrada                                                                   |
| Poseedor del enlace privado      | Token aleatorio de 43 caracteres almacenado como hash; acceso al pedido exacto, sin autoridad para registrar pagos                                        |
| ADMIN y OWNER                    | Sesión respaldada por base de datos, cuenta activa, roles protegidos y MFA verificado; acciones financieras reservadas a OWNER                            |
| Cambios financieros concurrentes | Orden consistente de bloqueos, versión y revisión aceptada, importe exacto en GTQ, revalidación de actor/MFA y transacción con auditoría                  |
| Datos del cliente                | Respuesta pública sin contacto/dirección/notas; encabezados privados y sin referencia; URLs de WhatsApp sin credenciales ni datos personales innecesarios |
| Correo y proveedor               | Outbox transaccional, contenido/destinatario congelados, clave de idempotencia, concesiones y ventana de reintento limitada                               |
| Ejecución programada             | Configuración explícita, contexto de producción Netlify y aprobación/prueba externas; no trabajador persistente supuesto                                  |

## Hallazgos y correcciones

### P2 — Límites de solicitudes después de la asignación de memoria

La ruta nueva de verificación de pagos y la aceptación de precios usaban `request.text()` y comprobaban la longitud cuando el cuerpo ya estaba cargado. Las rutas administrativas anteriores tenían el mismo patrón con `request.json()`. Una solicitud anónima con cuerpo grande podía consumir memoria antes de autenticar o validar.

Se agregó lectura incremental compartida en `src/server/http/read-bounded-json.ts`, con presupuesto de **bytes UTF-8**, cancelación al excederlo, liberación del lector y decodificación JSON estricta. Se aplicaron límites de 2,048 bytes a la verificación financiera, 256 bytes a la aceptación y 64 KiB a los otros 12 archivos de rutas JSON administrativas. La promoción máxima admitida de 500 productos sigue cabiendo y tiene regresión.

La entrada HTTP de Better Auth limita su cuerpo a 16 KiB antes de pasarlo a la biblioteca. Se preservan bytes, encabezados, JSON, formularios y operaciones con cuerpo vacío. Una regresión adicional detectó y corrigió el caso de reconstruir una solicitud consumida con cuerpo vacío. El exceso devuelve una respuesta genérica; no se imprimen credenciales ni cuerpos.

**Prueba:** los lectores anteriores consumían una cola deliberadamente inválida; las rutas corregidas cancelan antes de leerla. Hay cobertura para 14 métodos administrativos, entrada de autenticación, UTF-8 dividido/inválido, liberación del lector y entradas legítimas grandes.

### P2 — Dispositivos recordados incompatibles con MFA fresco

Better Auth aceptaba `trustDevice: true` en las verificaciones TOTP/códigos de recuperación y generaba una cookie de dispositivo recordado. En el ingreso posterior podía omitir el desafío, mientras la aplicación exigía `mfaVerifiedAt` generado por una verificación real. La sesión resultante se rechazaba, produciendo un bucle de acceso. **No se demostró un bypass de autorización:** el control de la aplicación seguía denegando la sesión.

El hook rechaza esa opción antes de consumir desafíos/códigos. Al ingresar, revoca y expira las cookies heredadas de dispositivo recordado antes de que puedan suprimir el desafío. No se convierte una cookie recordada en MFA fresco y no se debilita la reautenticación financiera.

**Prueba:** los casos HTTP reales devolvían éxito antes de la corrección y ahora rechazan la opción; una cookie heredada válida vuelve a exigir desafío. Se verifican también campos de sesión/usuario protegidos, canje concurrente único de códigos de recuperación y bloqueo de MFA que persiste entre desafíos.

### P2 condicional — Revocación inconsistente al anonimizar

El acceso mediante encabezado privado rechazaba `anonymizedAt`, pero la consulta por URL y la revisión por cookie no lo hacían de manera consistente. Esto habría mantenido acceso público a historial de productos/pago después de una futura anonimización. La ejecución de retención sigue deshabilitada; no se afirmó que hubiera datos operativos afectados.

La consulta pública y la revisión/aceptación por cookie comprueban la revocación en la misma transacción y bajo el bloqueo del pedido. Se conserva la revisión financiera interna para administradores autorizados.

**Prueba:** URL, cookie y aceptación se rechazan tras anonimizar; también se rechazan cuando la revocación ocurre durante una espera de bloqueo. La revisión financiera interna continúa disponible.

### P2 de disponibilidad — Credenciales inválidas en el bloqueo global

Los encabezados privados inválidos podían entrar en la cola del bloqueo global del catálogo antes de ser rechazados. Se reprodujo manteniendo ese bloqueo ocupado y observando que la solicitud inválida esperaba. No se extrapoló esto a una denegación de servicio operativa observada.

Se agregó comprobación de sintaxis y consulta indexada previa para enlaces privados y una comprobación previa de la asociación del checkout. La comprobación **se repite bajo bloqueo**: la lectura preliminar no autoriza una operación ni permite saltarse revocación, expiración o referencia exacta. Una prueba explícita de token inválido no se sustituye por otra cookie válida.

**Prueba:** recibos desconocidos y encabezados malformados/desconocidos de revisión y resumen se rechazan sin esperar el bloqueo ocupado; las regresiones de revocación concurrente siguen pasando.

### Dependencias — parches acotados

- Better Auth y sus adaptadores internos pasaron de **1.7.7 a 1.7.18**, dentro de la misma línea estable. Se revisó la [publicación oficial de seguridad del 3 de noviembre](https://better-auth.com/blog/security-release-2026-11-03). Varios avisos dependen de plugins o cachés que esta aplicación no activa; no se presentó su mera presencia como un exploit demostrado aquí.
- La auditoría npm inicial reportó ocho entradas moderadas derivadas de una misma dependencia de herramientas: [amplificación de patrones en minimatch, GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Un override exclusivo para `@typescript-eslint/typescript-estree` utiliza **minimatch 11.0.1**. No se degradó Next ni se reemplazó la plataforma.
- La instalación fue local, con scripts de instalación deshabilitados. La auditoría npm posterior reportó **0 avisos conocidos**. Eso no constituye garantía de ausencia de vulnerabilidades.

## Áreas revisadas sin otro defecto explotable confirmado

- No se confirmó un bypass de MFA, de rol OWNER ni de autorización financiera. Los campos protegidos de usuario/sesión no se pueden convertir en autoridad desde el cuerpo HTTP. Los rechazos o campos ignorados dejan intacto el estado autorizado.
- La verificación conserva importe exacto/GTQ, revisión vigente aceptada, método compatible, confirmación explícita, recepción real declarada por el dueño y restricciones de efectivo/cancelación. Las solicitudes simultáneas, duplicadas, obsoletas y los fallos tardíos de auditoría mantienen los invariantes.
- La migración 0017 mantiene evidencia append-only, claves únicas, relaciones y restricciones. Se probó su instalación e idempotencia en PostgreSQL temporal; no se reescribió ni se aplicó a producción.
- WhatsApp conserva la consulta privada, comprobación del resumen vigente, copia/reintento y separación entre abrir/enviar/pagar. El token privado y contacto/dirección/notas no forman parte del mensaje ni de la URL de salida.
- El correo conserva un único evento por pedido, transacción sin llamadas externas, reintentos de contenido/clave constantes y bloqueo cuando vence la ventana segura o cambia la configuración. La aceptación de API no se presenta como llegada a bandeja.
- La función programada no usa el cuerpo de una solicitud para seleccionar destinatario ni pedido; requiere contexto y preparación explícitos. Según la [documentación oficial de Netlify](https://docs.netlify.com/build/functions/scheduled-functions/), una función programada no se invoca por URL pública en producción. Su empaquetado local se comprobó; no se validó un despliegue real.
- El barrido de archivos rastreados y del checkpoint no encontró archivos privados `.env` versionados ni coincidencias con las formas de claves privadas/API examinadas. Fue una comprobación limitada de patrones, sin imprimir valores; no una prueba exhaustiva de ausencia de secretos.

## Validación y límites

| Comprobación                                    | Resultado                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Unitarias                                       | 432 pruebas, 64 archivos                                                      |
| Integración PostgreSQL                          | 240 pruebas, 31 archivos                                                      |
| Navegador con comercio deshabilitado            | 6 pruebas de MFA, acceso y administración de usuarios                         |
| Navegador checkout autorizado (10 de noviembre) | 18 pruebas de checkout, WhatsApp y pagos; 1 adicional de modo demo            |
| TypeScript / ESLint                             | Correctos                                                                     |
| Next build                                      | Correcto con configuración ficticia, comercio y notificaciones deshabilitados |
| Función Netlify                                 | Bundle independiente correcto                                                 |
| npm audit                                       | 0 avisos conocidos después de las correcciones                                |
| Preservación                                    | Índice original, HEAD, 22 archivos ajenos y migración 0017 comprobados        |

Se usaron exclusivamente clústeres PostgreSQL temporales en loopback, base `guteli_test`. No se utilizó Neon, no hubo cobros ni mensajes reales y los transportes de notificación en pruebas fueron simulados.

El **10 de noviembre de 2026**, tras la autorización explícita del usuario, se completó el recorrido de checkout/WhatsApp/pagos con `COMMERCIAL_ORDERS_ENABLED=true` exclusivamente en el servidor temporal de loopback y la base sintética `guteli_test`. Pasaron **18 pruebas** en escritorio y móvil: métodos compatibles, revisión de precios, enlaces privados, copia/reintento, aislamiento del popup sin referencia privada y verificación manual/cancelación/reembolso por OWNER con MFA. El caso exclusivo de demo se omitió intencionalmente en esa ejecución y pasó por separado: **1 prueba**, con copia disponible y navegación real a WhatsApp bloqueada. Las solicitudes externas a WhatsApp fueron interceptadas por las pruebas; los transportes reales de correo, WhatsApp y pagos permanecieron deshabilitados. Se sobrescribieron tanto la conexión de pruebas como la conexión directa de migración con PostgreSQL temporal; no se editaron archivos de entorno.

Evidencia local: `/private/tmp/guteli-prompt4-approved-checkout-browser.log` y `/private/tmp/guteli-prompt4-approved-demo-browser.log`. La restricción inicial de aprobación automática para estas pruebas quedó resuelta con esa autorización. Durante la validación aparecieron cambios simultáneos en `create-order.ts`, `repository.ts`, `login-protection.ts` y pruebas de concurrencia/límites distribuidos; se conservaron sin sobrescribirlos. Los resultados unitarios y de integración de la tabla corresponden a la ejecución previa de la auditoría: no se repitió la suite completa sobre esos cambios simultáneos.

No se probaron despliegue, DNS/TLS real, permisos operativos de Neon, recepción real de correo, restauración de producción ni reinicio de contenedor Docker. La política de conservación y cualquier anonimización operativa permanecen deshabilitadas. Los enlaces privados siguen siendo capacidades transferibles: quien los reciba puede consultar y aceptar ese pedido, pero no registrar cobros; deben mantenerse privados.

Resultado: correcciones locales verificadas dentro del alcance anterior, sin garantía absoluta de seguridad ni autorización de lanzamiento o activación comercial.

## Verificación previa a la publicación autorizada — 10 de noviembre

Tras la autorización para subir los cambios a GitHub, se preparó una copia aislada con una lista explícita de **119 archivos** de Prompt 2, auditoría y correcciones recientes. Se excluyeron **23 archivos locales**: fotografías, capturas, evidencia de revisión, auditorías anteriores y el cambio generado de `next-env.d.ts`. El índice y el árbol de trabajo originales se conservaron; `main` no se movió.

Sobre esa copia exacta de código pasaron **432 pruebas unitarias (64 archivos)**, **261 pruebas de integración PostgreSQL (34 archivos)**, TypeScript, ESLint y formato de los archivos compatibles. Las dos pruebas unitarias de sockets se bloquearon inicialmente con `listen EPERM` dentro del sandbox; la repetición con acceso autorizado a sockets locales pasó completa. Esto amplía la evidencia anterior a los cambios simultáneos: revocación de credenciales y desafíos MFA, límites distribuidos de autenticación y lectura concurrente del catálogo. No se repitieron las pruebas de navegador en esta fase de publicación.

El barrido limitado de patrones no dejó coincidencias pendientes: las únicas URLs señaladas eran fixtures sintéticos ya presentes y sin cambios en dos pruebas unitarias. No se incluyeron archivos privados de entorno. La publicación se prepara en `main-seguridad-checkout-20261110`, sin merge a `main`, con `[skip netlify]` en el mensaje del commit para omitir el despliegue automático documentado por Netlify. No se autorizan despliegues, migraciones operativas, activación comercial ni notificaciones reales.

Las ediciones que aparecieron después de congelar la copia verificada se conservan en el árbol original y quedan fuera de esta publicación. En particular, las adiciones posteriores a la guía del dueño y las nuevas regresiones de inscripción MFA no forman parte del commit verificado.
