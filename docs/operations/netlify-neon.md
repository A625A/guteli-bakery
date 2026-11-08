# Güteli en Netlify Free y Neon

Preparación del 08/11/2026, America/Guatemala. Esta guía no autoriza publicación, migración de la base activa, creación de cuentas reales ni activación comercial.

## Estado y arquitectura

- Delivery se integró en `main` local mediante `ef8f107`, conservando `061f036` y los siete commits de `main-delivery-coverage-20261025`. No era posible fast-forward sobre el main local divergente. El único conflicto fue el checkpoint histórico de Oracle; se conservaron ambas notas. Datos geográficos, evidencia y migraciones 0000–0016 permanecen completos.
- Next.js 16.4.2, Drizzle y `pg` se mantienen. Better Auth se actualizó de 1.7.2 a 1.7.7 para resolver los avisos de seguridad detectados; el campo existente `account.issuer` se conserva como campo adicional privado con valor predeterminado `local:credential`, sin cambiar migraciones. Netlify usa su adaptador OpenNext automático, `.next`, Node 22 y rutas dinámicas; Docker conserva `standalone`. No usar export estático ni una redirección SPA que capture `/admin` o `/api`.
- `DATABASE_URL` corresponde al endpoint Neon **pooled** (`-pooler`) con TLS. Cada proceso caliente comparte un pool de hasta 3 conexiones, espera hasta 10 segundos al conectar, libera conexiones inactivas a los 10 segundos y las renueva a los 300 segundos. Cada instancia puede crear su propio pool; no es un límite global. No se cierra el pool después de cada solicitud.
- Drizzle usa `DATABASE_URL_UNPOOLED` para migraciones. Rechaza endpoints Neon pooled y TLS deshabilitado. La conexión directa no sustituye la URL pooled del runtime.
- `/health` comprueba conectividad; **no demuestra que exista el esquema**. `/readyz` exige el journal completo, una consulta de aplicación y acceso al almacenamiento. Las respuestas públicas no revelan detalles internos. La comprobación de Blobs es de lectura: una carga y borrado autenticados son pruebas separadas.
- El proyecto Neon `late-mouse-14034564`, rama `br-ancient-frog-bc5lavdb` (`main`), base `guteli`, PostgreSQL 17, región `aws-us-east-1`, se inspeccionó en modo lectura: sin tablas de aplicación. No se ejecutaron migraciones en Neon.
- Las consultas HTTP sin sesión a `guteli.netlify.app` devolvieron `401` con la barrera de acceso de Netlify. No se pudo revalidar desde allí el catálogo, login, variables privadas ni logs del despliegue. No se cambió esa protección.

## Variables y ajustes pendientes

En Netlify, configurar mediante la interfaz del proyecto (el nombre suministrado es `heartfelt-cannoli-354d65`; confirmar su asociación con `guteli.netlify.app`). Usar el contexto **Production** y disponibilidad tanto en Builds como en Functions; si el plan no permite elegir scopes, mantenerlas disponibles en ambos. Las variables de `netlify.toml` por sí solas **no llegan a Functions**. No imprimir valores secretos.

| Variable                                                       | Valor o requisito                                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DEPLOYMENT_PLATFORM`                                          | `netlify` — añadir; activa la confianza exclusiva en el ingreso de Netlify                   |
| `STORAGE_PROVIDER`                                             | `netlify-blobs` — añadir; no usar `UPLOADS_ROOT` para persistencia                           |
| `DATABASE_URL`                                                 | URL pooled de **guteli/main**, `sslmode=verify-full` recomendado; conservar verificación TLS |
| `BETTER_AUTH_URL`                                              | `https://guteli.netlify.app` (origen canónico, sin `/admin`)                                 |
| `BETTER_AUTH_SECRET`                                           | Secreto aleatorio de al menos 32 bytes; estable entre despliegues                            |
| `RATE_LIMIT_SECRET`                                            | Secreto aleatorio distinto de al menos 32 bytes                                              |
| `RECEIPT_TOKEN_SECRET`                                         | Otro secreto aleatorio distinto de al menos 32 bytes                                         |
| `NEXT_PUBLIC_DEMO_MODE`                                        | `true` durante el build; un cambio requiere rebuild                                          |
| `COMMERCIAL_ORDERS_ENABLED`                                    | `false`                                                                                      |
| `PAYMENTS_ENABLED`                                             | `false`                                                                                      |
| `WHATSAPP_NOTIFICATIONS_ENABLED`                               | `false`                                                                                      |
| `WHATSAPP_AUTOMATION_AUTHORIZED` / `WHATSAPP_WEBHOOKS_ENABLED` | `false`                                                                                      |
| `DELIVERY_MAPS_ENABLED`                                        | `false` — añadir explícitamente                                                              |
| `DELIVERY_PROVIDER_APPROVED`                                   | `false` — añadir explícitamente                                                              |
| `DELIVERY_COVERAGE_ENABLED`                                    | `false` — añadir explícitamente                                                              |

`DATABASE_URL_UNPOOLED` se guarda exclusivamente en el entorno seguro del operador para migraciones. No requiere estar en Netlify. `TRUSTED_PROXY_HOPS` no es necesario en Netlify: se ignora XFF y se exige una IP válida en `x-nf-client-connection-ip`, sin fallback. No usar ese modo detrás de un servidor que permita al cliente falsificar dicha cabecera. Fuera de Netlify se conserva la validación de saltos del proxy existente.

No hacen falta claves Geoapify, credenciales de pagos, tokens WhatsApp ni un token personal de Netlify para Blobs en Functions. No establecer manualmente `NETLIFY_BLOBS_CONTEXT`. El adaptador proporciona el contexto privado. `GUTELI_DEPLOY_CONTEXT` se fija desde `CONTEXT` durante el build; no contiene secretos.

El comando de Netlify ejecuta `production:check` antes del build. Es una validación de configuración, **sin conectar a la base ni modificar datos**. Rechaza activaciones comerciales/geográficas en esta preparación. No hay migraciones, seeds ni altas de usuarios en hooks de build o solicitudes HTTP.

Antes de permitir Deploy Previews, proporcionar base Neon aislada y secretos propios para ese contexto, junto con su origen HTTPS exacto de Better Auth. Si no se puede proporcionar aislamiento, deshabilitar esos builds. No heredar la base de producción. No se agregaron comodines a los orígenes de autenticación.

## Fotografías persistentes

Se eligió Netlify Blobs con el SDK oficial `@netlify/blobs` 11.1.8: evita una cuenta/proveedor adicional y conserva `ObjectStorage`. Producción usa el store del sitio `guteli-product-images` en `us-east-2`, compartido entre despliegues. Previews usan stores del despliegue y no pueden sobrescribir el namespace de producción a través de este adaptador. No cambiar región/nombre sin una transferencia explícita de objetos.

Se usan lecturas consistentes y escrituras condicionales `onlyIfNew`; no se sobrescriben claves existentes. Las rutas públicas consultan primero los productos activos; las privadas exigen rol/MFA. Blobs no se expone directamente al navegador. Se preservan límites de lectura, normalización de claves, validación MIME/contenedor/píxeles, transformación con Sharp, borrado y cola de recuperación existente. Los errores del proveedor se sanitizan. El SDK no se inicializa al calcular URLs ni durante el build.

Se aceptan originales JPEG/PNG/WebP de hasta 8 MiB. Netlify limita las solicitudes binarias a aproximadamente 4.5 MB por la codificación de su infraestructura: en el build Netlify, el navegador prepara los originales mayores de 4 MiB como WebP de hasta 2400 px y máximo 4 MiB antes de enviarlos. La imagen transmitida vuelve a validarse y transformarse en el servidor. Las imágenes que no se puedan preparar muestran un error y requieren una versión más pequeña. El desarrollo local conserva el transporte anterior de hasta 8 MiB.

Blobs admite objetos de hasta 5 GB, pero la aplicación mantiene su límite de 8 MiB. El plan Free basado en créditos incluye 300 créditos mensuales con límite duro: builds, cómputo y tráfico comparten ese presupuesto; no representa almacenamiento/tráfico ilimitados. Blobs figura como beta. Revisar el plan real en Billing, especialmente si la cuenta conserva un plan Legacy. No se activó servicio pagado, recarga ni suscripción.

Durabilidad no equivale a backup: conservar los originales aprobados y preparar un export/restore separado. Las imágenes locales existentes no se transfieren automáticamente. Si hay registros previos con imágenes, inventariar sus `storage_key`, copiar los bytes con esas mismas claves y comparar hashes antes de cambiar el proveedor. No ejecutar `db:seed` para hacer esa transferencia ni para rellenar Neon.

## Inicialización segura de Neon (requiere autorización separada)

1. Confirmar proyecto, rama y base de destino en la consola. Repetir la inspección: el resultado de cero tablas es una observación fechada, no permiso para sobrescribir nada. Revisar también `drizzle.__drizzle_migrations`. Si hay tablas inesperadas o un journal parcial, detenerse y diagnosticar; no usar `drizzle-kit push`, `DROP`, reset ni seed.
2. Obtener la URL directa y guardar las variables en un archivo privado fuera del repositorio y fuera de carpetas sincronizadas, con permisos `0600`, mediante un editor/gestor seguro. No pegar secretos en chats, argumentos del shell, logs, capturas o Git. Para pruebas, usar una base desechable y `DATABASE_URL_TEST`; las suites son destructivas sobre esa base y **jamás deben apuntar a guteli/main**.
3. Las migraciones se ensayaron desde cero y en segunda ejecución sin cambios sobre PostgreSQL 17 local aislado. Son 17 entradas, 23 tablas públicas y 6 enums. La prueba compara hashes, fechas, columnas, nulabilidad, nombres de restricciones e índices válidos contra el snapshot final. Las suites existentes ejercitan restricciones y flujos de pedidos/catálogo/auth.
4. Antes de migrar la base activa, crear un respaldo/snapshot o rama de recuperación en Neon y verificar el procedimiento de restauración y sus límites del plan. Obtener autorización para la migración del destino confirmado. No modificar la rama de producción para probar un rollback.
5. Con Node 22 y el checkout final revisado, ejecutar **solo después de la autorización**:

```sh
node --env-file=/ruta/privada/guteli-operador.env node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.config.ts
```

El archivo del operador debe contener `DATABASE_URL_UNPOOLED` directa con TLS. Para el comando de provisión también requiere `DATABASE_URL` pooled, `BETTER_AUTH_URL` canónica y los mismos secretos de la aplicación (`BETTER_AUTH_SECRET`, `RATE_LIMIT_SECRET`, `RECEIPT_TOKEN_SECRET`). No ejecutar este comando como parte de `npm run build`.

6. Verificar mediante SQL de lectura:

```sql
SELECT current_database(), version();
SELECT count(*) AS migrations, max(created_at) AS latest
FROM drizzle.__drizzle_migrations;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
  AND column_name LIKE 'delivery_%' ORDER BY column_name;
SELECT count(*) AS catalog_rows FROM products;
```

Comparar las 17 filas del journal con `drizzle/meta/_journal.json` y los hashes SHA-256 de los SQL; la última entrada es `0016_delivery_location`. No editar migraciones ya aplicadas. Una segunda ejecución del migrador no debe añadir filas.

7. Tras un despliegue autorizado, comprobar `/health/`, `/readyz/`, `/`, `/menu/`, `/api/products/`, `/admin/login/` y la redirección de `/admin/` sin sesión. Sin registros de catálogo, la tienda muestra un catálogo vacío; no debería mostrar un error de consulta. Agregar contenido real aprobado desde admin, no desde el seed de desarrollo.

## Propietario y MFA

`scripts/create-owner.ts` requiere TTY y no acepta argumentos; enmascara la contraseña y sanitiza errores. La provisión usa transacción y bloqueo advisory, crea un solo OWNER inicial y no reemplaza cuentas existentes. La credencial inicial vence a las 24 horas y exige cambio de contraseña y alta de MFA.

Crear la cuenta real modifica datos y requiere autorización separada. Tras instalar y verificar el esquema, el operador ejecuta en su terminal privada:

```sh
NODE_ENV=production node --env-file=/ruta/privada/guteli-operador.env --conditions=react-server --import tsx scripts/create-owner.ts
```

Usar el mismo `BETTER_AUTH_SECRET` y origen de la aplicación. Escribir correo, nombre y contraseña únicamente en esa terminal. No solicitar ni copiar las credenciales al chat. Si ya existe una cuenta, el script se niega a crear otro bootstrap OWNER; no borrar usuarios para eludirlo.

Abrir `/admin/login/` en el origen canónico, cambiar la contraseña inicial, configurar el autenticador, guardar códigos de recuperación en un gestor privado y verificar TOTP. Comprobar cookies `Secure`, `HttpOnly`, `SameSite=Lax`, sesión de 8 horas, logout y acceso sin sesión denegado. Para recuperación usar un código de un solo uso desde `/admin/verify-mfa/`. Si se pierden autenticador y códigos, escalar al responsable técnico; no desactivar MFA ni editar hashes manualmente. Ver [guía del dueño](guia-del-dueno.md).

## Verificación antes de publicar

Consultar [reporte de preparación](../audits/2026-11-08-netlify-neon-preparation.md) para resultados ejecutados y límites. La prueba `playwright.netlify.config.ts` usa HTTPS local, PostgreSQL temporal y el emulador oficial de Blobs; **no demuestra la red ni la ejecución remotas de Netlify/Neon**. Además se ejecutó `netlify build --offline --context production` con el adaptador oficial: empaquetó servidor y middleware, sin publicación.

Para reproducir el recorrido nuevo: compilar con `NETLIFY=true CONTEXT=production NEXT_PUBLIC_DEMO_MODE=true` y secretos ficticios de prueba; después ejecutar `DATABASE_URL_TEST=<URL local guteli_test> npx playwright test --config=playwright.netlify.config.ts`. Nunca utilizar credenciales reales en ese harness. Los puertos 3148/3149 deben estar libres. Los recorridos originales de delivery se ejecutan aparte con `playwright.delivery.config.ts` y `playwright.delivery-review.config.ts`.

Para autorizar publicación, revisar el commit final, las variables de producción, los logs/build del proyecto correcto y que el autodespliegue de `main` mantenga los bloqueos. Autorizar por separado push/despliegue y migración/provisión. Después verificar en la infraestructura real cookies/MFA, IP sobrescrita por el ingreso, lecturas pooled, subida/borrado de fotos y permanencia tras redespliegue. Mantener Q10/Q35 y Geoapify deshabilitados hasta aprobación comercial y del proveedor.

## Fuentes oficiales consultadas el 08/11/2026

- [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
- [Variables de Functions](https://docs.netlify.com/build/functions/environment-variables/).
- [Límites de Functions](https://docs.netlify.com/build/functions/configuration/).
- [API y consistencia de Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/).
- [Planes por créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).
- [IP del ingreso de Netlify](https://answers.netlify.com/t/upcoming-change-stripping-exposed-netlify-headers-from-function-and-proxy-requests/52665).
- [Pooling de Neon](https://neon.com/docs/connect/connection-pooling).
