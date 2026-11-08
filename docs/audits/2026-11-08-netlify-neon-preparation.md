# Preparación local de Netlify y Neon

08/11/2026, America/Guatemala. Alcance: Prompt 1 y continuación autorizada para implementación y pruebas locales. No es aceptación comercial ni evidencia de despliegue remoto.

## Estado por fase

1. **Delivery integrado en main local.** Se inspeccionaron estado, ramas e historiales y se hizo fetch antes de modificar. La fuente `97bf339` estaba siete commits por delante de `origin/main` (`8a8bfa0`). El main local `061f036` tenía historia propia: se preservó mediante merge `ef8f107`, sin rebase ni force. El único conflicto, en el checkpoint de Oracle, conserva ambas notas. Geometría, evidencia, búsqueda, cotizaciones firmadas, fallback manual y migración 0016 permanecen completos. Tarifas Q10/Q35 y proveedor siguen deshabilitados.
2. **Compatibilidad implementada.** Configuración Netlify con Node 22 y adaptador automático, pool compartido de tres conexiones por proceso, TLS Neon y URL directa separada para migración. Confianza exclusiva en la IP de ingreso de Netlify; XFF no sirve de fallback. Preflight exige demo y bloqueos comerciales. Better Auth 1.7.7 conserva cookies, MFA, roles y esquema existente; `issuer` permanece como campo adicional privado. Se excluye la salida generada `.netlify` de Git, lint, formato y TypeScript.
3. **Migraciones ensayadas.** PostgreSQL 17.11 temporal en loopback: 17 migraciones, 23 tablas públicas y seis enums. Se verificaron hashes/orden, segunda ejecución sin cambios, columnas/nulabilidad, restricciones validadas, índices válidos y catálogo vacío sin errores. No se cambió ningún SQL histórico ni se migró Neon.
4. **Fotografías adaptadas.** `ObjectStorage` conserva su interfaz y almacenamiento local. Netlify Blobs usa escrituras condicionales, lecturas limitadas, errores sanitizados y separación entre producción y previews. Readiness ya no exige un volumen local en Netlify. Originales de 4–8 MiB se preparan en navegador para caber en el transporte de Netlify y se vuelven a validar en el servidor. No se contrató almacenamiento ni se copiaron archivos reales.
5. **Admin preservado y probado localmente.** Rutas incluidas en build/funciones. Se verificaron cambio de contraseña inicial, MFA, cookies seguras, roles, CSRF, privacidad y gestión de fotografías en escritorio/móvil. Provisión y recuperación se documentaron; no se creó propietario real.

## Evidencia ejecutada

| Comprobación                                    | Resultado final                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm test`, Node 22                             | 60 archivos, 385 pruebas aprobadas                                                          |
| `npm run test:integration`, PostgreSQL 17 local | 27 archivos, 185 pruebas aprobadas después de actualizar Better Auth                        |
| `npm run lint`                                  | Aprobado, cero advertencias                                                                 |
| `npm run typecheck`                             | Aprobado                                                                                    |
| `npm run production:check`                      | Aprobado con configuración ficticia segura; sin conexión a DB                               |
| `npm run build` dentro del comando Netlify      | Aprobado; rutas dinámicas, admin, API, health y readyz                                      |
| `netlify build --offline --context production`  | Aprobado con Runtime 5.16.6; funciones del servidor y middleware empaquetadas localmente    |
| `playwright.netlify.config.ts`                  | 4 pruebas aprobadas: TLS/admin, fotos a 1440/390 px, readiness/catálogo y bloqueos públicos |
| `playwright.delivery.config.ts`                 | 3 pruebas aprobadas: mapa/cotización, fallback manual y descarte de búsqueda obsoleta       |
| `playwright.delivery-review.config.ts`          | 2 pruebas aprobadas: revisión geográfica/exportación y entradas inválidas                   |
| `npm audit --omit=dev`                          | 0 vulnerabilidades tras actualizar Better Auth a 1.7.7                                      |

Las pruebas de Blobs usan el SDK real contra su emulador oficial. Las de navegador usan HTTPS local y PostgreSQL desechable, con cuentas y fotografías sintéticas. La suite delivery habilita pedidos únicamente en loopback para ejercitar el formulario; intercepta las llamadas de cotización/pedido y mantiene proveedores y notificaciones apagados. No representa activación comercial.

Durante la preparación hubo fallos corregidos: permisos de sockets del sandbox, región explícita del emulador, observación de cargas multipart en Playwright, cambio de tipo `issuer` al actualizar Better Auth y herramientas intentando analizar `.netlify` generado. Los resultados de la tabla son las ejecuciones posteriores satisfactorias. No se ejecutó un recorrido remoto autenticado ni se verificó Oracle nuevamente.

## Estado externo y autorizaciones pendientes

- La inspección de lectura de Neon encontró cero tablas de aplicación en `guteli/main`, proyecto `late-mouse-14034564`, rama `br-ancient-frog-bc5lavdb`. Es una observación fechada: debe repetirse antes de inicializar.
- Las rutas remotas consultadas devolvieron 401 de la protección de acceso de Netlify. No se pudieron certificar los logs/configuración privados, la correspondencia del nombre de proyecto suministrado ni las sesiones reales del sitio.
- **Requiere autorización:** push de main, despliegue Netlify, cambios de variables externas, backup/rama de recuperación y migración de Neon, provisión del OWNER real y cualquier transferencia de imágenes reales. No se ejecutó ninguna de estas acciones.
- Después de publicar y migrar con autorización, verificar en el sitio real conexión pooled, origen/cookies/MFA, cabecera de IP sobrescrita, carga/borrado y permanencia de imágenes después de un redespliegue. Aislar bases/secretos de previews. Revisar Billing y respaldos: Free no implica capacidad ilimitada ni backup.
- Mantener demo, pedidos, pagos, WhatsApp, mapas y cobertura en sus valores seguros hasta aprobación específica.

La [guía operativa](../operations/netlify-neon.md) contiene la tabla exacta de variables, los comandos manuales de migración/provisión y los pasos externos pendientes.

## Preservación del trabajo anterior

Se conservaron los archivos ajenos al alcance: `artifacts/owner-review/`, `products/`, la auditoría del 07/11 y el cambio local previo de `next-env.d.ts` hacia `.next/dev/types`. No se incluyeron en el commit de preparación. No se descartó historia ni se eliminó ninguna rama.
