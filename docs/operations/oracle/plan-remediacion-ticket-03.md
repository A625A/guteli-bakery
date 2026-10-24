# Remediación de dependencias — Ticket 03

## Resultado vigente — 24/10/2026

**Preparación técnica de dependencias aprobada localmente. npm: 0 entradas en el árbol completo y 0 en el filtro producción.** Esto elimina el bloqueo concreto por las alertas npm registradas; no autoriza publicación, instalación Oracle ni aceptación comercial. Cuota/capacidad/costos/hostname, DNS/HTTPS público y aceptación real de dueños siguen pendientes. No se inició otro ticket.

Se publicaron primero, por fast-forward, `2b9db89` (Ticket 04), `c4ef532` (fotografías) y `d374b11` (cierre05). SHA remoto confirmado: `d374b111610ff2a2643d76d2b3a370ecc6b69fe6`. El segundo grupo coherente es package/lock + este cierre, en el commit que contiene este informe. Autorización exclusivamente para commits/push a `origin/infra/oracle-always-free-preparation`; sin merge/main, Oracle, hackathon ni activaciones.

### Versiones aplicadas

| Paquete directo | Antes → ahora |
|---|---|
| Next / eslint-config-next | 16.3.3 → **16.4.2** |
| sharp | 0.35.4 → **0.35.5**, librsvg **2.63.2** |
| Zod | 4.4.3 → **4.6.6** |
| Vitest | 3.2.7 → **4.1.12**; Tinypool eliminado |
| Vite | 6.4.3 → **6.4.5** |
| typescript-eslint | 8.55.0 → **8.56.0**, mínimo requerido por el nuevo config de Next |

Resoluciones dirigidas dentro de rangos existentes: baseline-browser-mapping2.11.32, source-map-js1.2.2, brace-expansion1.1.21/2.1.7, browserslist4.29.4, fast-uri3.1.9 y js-yaml4.3.2. Transitivas propias de Next/sharp/Vitest/TypeScript ESLint se resolvieron con sus nuevos padres. React/ReactDOM19.2.7, Better Auth1.7.2, pg8.23.0, Drizzle ORM0.45.2 y Kit0.31.10 conservados; sin cambios de código de negocio, SQL ni assertions.

Dos overrides acotados:

- `@esbuild-kit/core-utils@3.3.2 → esbuild0.25.12`: sustituye la copia0.18.20 vulnerable. Cruza el rango antiguo, como anticipaba el plan; se validaron configuración CLI, 16 migraciones en PostgreSQL nuevo nativo y ARM64, y las regresiones de administrador. La copia de tsx no cambia. Mantenerlo hasta que el padre pueda retirar la dependencia obsoleta.
- `serve@14.2.6 → compression1.8.2`: el padre fijaba1.8.1. Patch corregido; comprobado arranque de serve en loopback, respuesta gzip y descompresión byte por byte del fixture. No se publica serve en el runner.

Se consultaron manifiestos npm y avisos oficiales antes de instalar. El [aviso de Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) apareció en la consulta del candidato y exigió un parche adicional. El [aviso de braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) fue retirado el23/10/2026: su desaparición y la de sus metavulnerabilidades no se atribuyen a un parche de braces. Next/sharp y los demás umbrales propuestos fueron revalidados contra sus avisos/manifiestos enlazados en el historial.

### Resultados y límites

| Consulta | Moderadas | Altas | Críticas | Total |
|---|---:|---:|---:|---:|
| Histórico22/10, completo | 6 | 14 | 3 | 23 |
| Histórico22/10, filtro producción | 6 | 3 | 3 | 12 |
| Candidato final24/10, completo | 0 | 0 | 0 | **0** |
| Candidato final24/10, filtro producción | 0 | 0 | 0 | **0** |

Antes había11 entradas excluidas por el filtro; ahora0. El filtro incluye peers opcionales de herramientas y no equivale al inventario del runner. Son entradas npm, no CVE únicas ni prueba de explotabilidad. La comparación usa el reporte histórico conservado, sin repetirlo: cambiaron paquetes y metadatos de advisories. Se repitieron solo las dos consultas del candidato tras el cambio justificado de Zod (1 alta →0).

- **npm ci**, grafo/peers, TypeScript y ESLint: aprobados con Node22.23.4. npm10.9.9 falló al resolver peers (`edgesOut`); se usó npm11.21.1 aislado y regeneración dirigida de entradas anidadas obsoletas. El lock final sí instala con npm10.9.9 en macOS y Docker. Sin `audit fix`, force, actualizaciones globales ni cambios de assertions.
- **100 unitarias** en12 archivos: imágenes, demo/readiness, autorización/seguridad/acceso admin, referencias PRUEBA, promociones, checkout y consentimiento. **40 integración** en4 archivos: imágenes12, ciclo de autenticación/MFA, autorización y catálogo. Ver comandos exactos en la evidencia.
- **Un build de producción Linux ARM64** del candidato final, con builder reutilizado para ensamblar runner. Next16.4.2 + sharp0.35.5/rsvg2.63.2 generan WebP. No se reutilizó el binario anterior como validación del cambio. Las advertencias preexistentes `InvalidDefaultArgInFrom` corresponden al ARG de imagen obligatorio, proporcionado con digest.
- **5/5 navegador sobre ese runner**, no sobre dev: demo3 y fotografías2, Chromium1440/390; carrito, creación/edición/reemplazo/eliminación de fotos, errores/reintento, persistencia, OWNER/ADMIN y MFA. Pruebas existentes sin alterar assertions. Capturas nuevas fuera del repositorio, originales intactas.
- Compose real con override exclusivamente local: PG17, app y Caddy saludables; HTTPS con CA interna verificada; `/readyz`200 y archivos privados404; cuatro POST comerciales403. Puertos solamente loopback. Reinicio de PG/app/proxy preserva catálogo y hashes de imágenes; **0 pedidos y0 eventos de salida**. No se envían cobros ni mensajes.
- Runner inspeccionado: sin Vitest, Vite, Drizzle Kit, ESLint, typescript-eslint, esbuild, compression ni braces. Imagen `sha256:4134b890dc4964f3f3834961fba37a721a2d91e28ffabdaa61990fc1d39df1b7`. Inventario acotado; no auditoría de paquetes del sistema operativo ni certificación general del contenedor.

Incidencias del harness temporal, resueltas sin cambiar aplicación ni reconstruir imagen: permiso de directorio del PG nuevo, variable de exportación del certificado, montaje del seed de imágenes y selección de hostname/SNI para TLS. Se reutilizaron las pruebas existentes; DNS ficticio mapeado solo en sus procesos. No se repitieron backup/restore ni suites completas.

[Evidencia agregada, hashes y comandos](../../../artifacts/oracle-preparation/ticket-03/remediation-evidence.json). Logs, scripts temporales, capturas, secretos ficticios y bases quedan privados en `/private/tmp/guteli-security-vwdel3i6`; la VM conserva `/tmp/guteli-security-vwdel3i6` y la copia de fuente separada. PostgreSQL nativo, contenedores y Colima detenidos. No se borraron bases, respaldos o volúmenes. Los109 archivos previamente pendientes se verificaron intactos antes del cierre documental; cambios de cuota/hostname03 siguen separados del commit.

## Propuesta histórica — no usar como estado vigente

22/10/2026, America/Guatemala. **Sólo propuesta: no aplicada.** Rama `infra/oracle-always-free-preparation`, HEAD `6eb72daed77589049828aa3338469ebcbbcea3f6`. Se reutiliza el [reporte guardado](dependencias-ticket-03.md): 12 entradas del filtro producción, no 12 vulnerabilidades explotables demostradas. No se repitió audit ni se ejecutaron instalaciones, builds o pruebas. Se consultaron advisories, manifiestos públicos npm y configuración local; un solo agente.

## Cambios propuestos, en orden

| Prioridad / entradas cubiertas | Cambio mínimo propuesto | Compatibilidad y riesgo |
|---|---|---|
| 1 — `next` crítica, `sharp` alta (2) | `next` **16.3.3 → 16.4.2**, `sharp` **0.35.4 → 0.35.5**; elevar también el mínimo declarado de sharp para no permitir 0.35.4. Alinear `eslint-config-next` a 16.4.2 como único acompañante de desarrollo del framework. | Next permanece en major 16; sharp cambia patch. Sus engines aceptan Node 22.23.4 y Next acepta React/ReactDOM19.2.7 existentes. El config ESLint admite ESLint9.39.5 y TS5.9.3, pero puede cambiar reglas/transitivas: revisar ese diff sin reformat masivo. Validar binarios ARM64/libvips. |
| 2 — `vitest` crítica, `tinypool` crítica, `@vitest/mocker` moderada (3) | **Vitest 3.2.7 → 4.1.12**, con `@vitest/mocker`4.1.12 resuelto por Vitest. **Retirar Tinypool del grafo mediante esta actualización**, no forzar Tinypool 2 dentro de Vitest 3. | Vitest 4 elimina Tinypool; en el lock actual Vitest es su único padre. Tinypool se corrige upstream en2.1.2, pero cruzaría el rango `^1.1.1` de Vitest 3. Es el cambio con mayor riesgo: mocks, aislamiento y workers. Better Auth1.7.2 admite Vitest 4 como peer opcional; no requiere actualizar autenticación. |
| 2 — `vite` alta (1) | **6.4.3 → 6.4.5**, conservando major 6 y evitando el salto automático a7/8. | Vitest 4.1.12 admite Vite6. Ajustar sólo resolución y restricciones de versión; no agregar servidor de desarrollo público. |
| 3 — `baseline-browser-mapping` moderada, `source-map-js` alta (2) | Resolución dirigida del lock a **2.11.0** y **1.2.2**, respectivamente; preferir actualización de transitivas dentro de los rangos existentes, sin agregarlas como dependencias directas ni override global. | Next 16.4.2 permite baseline `^2.9.19`; PostCSS8.5.23 permite source-map-js `^1.2.1`. Riesgo acotado en datos de navegadores, CSS y sourcemaps; confirmar que no quedan copias antiguas. |
| 4 — `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils`, `esbuild`, todas moderadas (4) | Mantener Drizzle Kit0.31.10 y ORM0.45.2. **Probar un override específico** de esbuild sólo bajo `@esbuild-kit/core-utils@3.3.2`, de0.18.20 a **0.25.12**, ya presente en el lock como otra copia. | El parche upstream comienza en0.25.0. El override rompe el rango declarado `~0.18.20`: es candidato condicionado, **no compatibilidad confirmada**. Si falla carga de configuración/migración, retirarlo y mantener este bloque abierto; no forzar downgrade0.18.1 ni migración Drizzle1.x. |

Total: **2 + 3 + 1 + 2 + 4 = 12 entradas**. Las cuatro de Drizzle son una cadena de metavulnerabilidades sobre la copia antigua de esbuild, no cuatro fixes independientes. El resultado esperado debe confirmarse después sobre el nuevo grafo; no prometemos que el contador final sea cero.

## Hechos verificados y límites

- Next 16.4.2 está publicado y exige sharp `^0.35.5` como dependencia opcional. El advisory de imágenes se corrige desde Next 16.4.1;16.4.2 es el candidato conservador sugerido por el reporte guardado y queda fuera de todos sus rangos afectados. No afirmamos que sea la primera versión corregida para cada advisory. [Manifiesto Next](https://registry.npmjs.org/next/16.4.2), [aviso del mantenedor](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
- sharp0.35.5 incorpora librsvg 2.63.2 corregida y publica binarios Linux ARM64. `images.unoptimized: true` ya existe, pero no resuelve por sí solo el uso directo de sharp en uploads ni los otros avisos de Next. [Aviso sharp](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [manifiesto](https://registry.npmjs.org/sharp/0.35.5).
- `@vitest/mocker` necesita **4.1.12**, no sólo4.1.11, por el segundo aviso. Vitest 4 modifica mocks y pools, y elimina Tinypool. Su engine es `^20 || ^22 || >=24`: **Node 23.9.0 local no es compatible; usar Node 22.23.4 ya validado**, sin actualizar globalmente el host. [Manifiesto](https://registry.npmjs.org/vitest/4.1.12), [migración4](https://v4.vitest.dev/guide/migration), [aviso mocker](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [parche Tinypool](https://github.com/advisories/GHSA-85c8-ppgw-ccpr).
- Vite6.4.5 existe y queda fuera de los rangos del reporte. Baseline2.11.0 y source-map-js1.2.2 existen y coinciden con sus umbrales de corrección. [Vite](https://registry.npmjs.org/vite/6.4.5), [baseline](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
- Drizzle Kit estable0.31.11 todavía declara `@esbuild-kit/esm-loader`; sus últimas versiones2.6.5/3.3.2 están deprecadas y conservan esbuild `~0.18.20`. Por eso no propongo ese patch cosmético como solución. El aviso es sobre el servidor de desarrollo de esbuild: ausencia de exposición debe demostrarse, no inferirse sólo de la etiqueta dev. [Manifiesto Drizzle](https://registry.npmjs.org/drizzle-kit/0.31.11), [core-utils](https://registry.npmjs.org/@esbuild-kit/core-utils/3.3.2), [esm-loader](https://registry.npmjs.org/@esbuild-kit/esm-loader/2.6.5), [parche esbuild](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).

## Verificaciones dirigidas al implementar, no ejecutadas ahora

1. Con autorización, guardar snapshot/hash de package y lock **del estado previo a la remediación**, sin descartar los documentos/evidencia pendientes. Aplicar grupos pequeños, revisar cada diff y aceptar sólo paquetes objetivo y transitivas justificadas. Sin `npm audit fix --force`, actualización general ni codemods automáticos. Leer docs de Next instaladas para la versión candidata antes de cualquier adaptación de código.
2. En Node 22: comprobar resolución/peers y ausencia de duplicados vulnerables; typecheck y lint del proyecto por el cambio de framework/config. Verificar específicamente Next/sharp y desaparición de Tinypool tras migrar Vitest. `--omit=dev` no acredita qué incluye standalone.
3. Ejecutar una selección explícita existente: unitarias `image-validation`, `image-assets`, `commercial-demo`, `oracle-readiness`; integración `admin-images`, `admin-auth-lifecycle`, `admin-authorization` sobre **DB ficticia aislada**. Esto cubre imágenes válidas/malformadas, conversión, permisos, sesiones y mocks/cleanup entre casos. No suavizar assertions ni regenerar snapshots en masa para pasar Vitest 4.
4. Para el override de esbuild: cargar `drizzle.config.ts` mediante la CLI, reproducir migraciones existentes en una DB temporal vacía y comprobar esquema esperado. Sin generar migraciones ni modificar SQL/datos existentes. Si no es compatible, el plan queda parcialmente bloqueado: documentar aislamiento de herramientas y pedir un alcance específico para resolver esa cadena; no declarar remediación total.
5. **Un build/runtime Linux ARM64 nuevo del candidato final**, justificado por Next/sharp/binarios distintos; no repetir el ciclo completo de Ticket 02. Comprobar `sharp.versions.rsvg` corregido, inventario del runner y que herramientas no se publican. Reutilizar smoke de catálogo/carrito, login/MFA, privacidad, `/readyz` y rechazo demo403; sin repetir backups/restore ni auditoría de infraestructura intacta.
6. Sólo después de cambios reales, consultar una vez el reporte completo y otra vez el filtro producción, guardar evidencia nueva junto a la anterior y comparar las12 entradas. Revisar avisos nuevos sin actualizar paquetes ajenos automáticamente. Un aviso de herramientas sólo puede quedar como excepción explícita y justificada; por defecto **la publicación sigue bloqueada**.

Reversión si hay regresión: restaurar únicamente los archivos/dependencias del grupo desde el snapshot previo y reinstalar con ese lock en el entorno aislado; conservar evidencia del intento. No `reset --hard`, borrado de artefactos ni vuelta automática al HEAD que perdería trabajo documental. El candidato vulnerable recuperado sigue sin permiso de publicación.

No cambios en React, Better Auth, ORM, esquema, infraestructura o código de negocio previstos. Ajustes de configuración/tests sólo si una incompatibilidad concreta los exige. Sin commit/push/merge, Oracle, Ticket 04 ni despliegue.
