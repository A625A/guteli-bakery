# Ticket 03 — Revisión dirigida de dependencias

## Estado actualizado — 24/10/2026

Remediación aplicada y validada localmente: **0 entradas npm en árbol completo y filtro producción**. Versiones, overrides, pruebas y límites en el [informe de remediación](plan-remediacion-ticket-03.md) y su evidencia agregada. Se retira solo el bloqueo por estas dependencias; permanecen los requisitos de cuenta/hostname, aceptación comercial y autorización de despliegue. El aviso de braces fue retirado por su publicador; Zod recibió un parche por una alerta nueva.

## Reporte histórico conservado — 22/10/2026

Los JSON y logs originales enlazados abajo son evidencia local, no se incluyen en el commit. Los datos históricos siguientes no describen el candidato actual.

22/10/2026, America/Guatemala. **Bloqueo previo a cualquier publicación pública.** Sin actualizaciones, instalaciones, refactorización, build ni suites. `package.json` y `package-lock.json` permanecen idénticos a HEAD; el lockfile coincide byte por byte con la fuente conservada de Ticket 02.

## Método y resultado

Se conservó el reporte histórico de `npm ci` de Ticket 02: **23 (6 moderadas, 14 altas, 3 críticas)**. No existía un desglose por advisory en su evidencia agregada. Se consultó el registro público npm sobre copias de package/lock en `/private/tmp/guteli-ticket03-s0p1okj0`, con Node23.9.0/npm10.9.2 del host. Esto consulta metadatos del lockfile, no ejecuta el runtime ARM64. Un intento inicial falló por DNS de la sandbox; luego hubo dos consultas exitosas, ambas con salida1 por vulnerabilidades:

```sh
npm audit --package-lock-only --ignore-scripts --json --registry=https://registry.npmjs.org
npm audit --omit=dev --package-lock-only --ignore-scripts --json --registry=https://registry.npmjs.org
```

Se usó cache temporal y se guardaron [reporte completo](../../../artifacts/oracle-preparation/ticket-03/npm-audit-full.json), [filtro producción](../../../artifacts/oracle-preparation/ticket-03/npm-audit-production.json) y [procedencia/hashes](../../../artifacts/oracle-preparation/ticket-03/evidence.json). No se ejecutó `npm audit fix`. [Semántica oficial de npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

| Consulta | Moderadas | Altas | Críticas | Total |
|---|---:|---:|---:|---:|
| Árbol completo | 6 | 14 | 3 | **23** |
| `--omit=dev` | 6 | 3 | 3 | **12** |
| Excluidas por el filtro | 0 | 11 | 0 | **11** |

Son entradas de paquetes vulnerables/metavulnerables según npm; no 23 CVE únicas ni 23 rutas explotables demostradas. Las dos consultas son un snapshot del 22/10, no una reconstrucción exacta de cada advisory disponible el día de Ticket 02, aunque sus totales coinciden.

## Producción frente a herramientas

| Grupo en el lockfile | Paquetes y severidad máxima del reporte | Interpretación |
|---|---|---|
| Producción directa | `next@16.3.3` **crítica**, `sharp@0.35.4` **alta** | Declarados en dependencies. Next ejecuta el servidor; sharp participa en procesamiento de imágenes. Prioridad de remediación antes de exponer. |
| Transitivas de producción | `baseline-browser-mapping@2.10.43` moderada (`next` también la declara); `source-map-js@1.2.1` alta (vía `postcss`) | No descartar por nombre de herramienta. Presencia/uso exactos en la imagen standalone final pendientes de inspección específica. |
| Herramientas que persisten en el filtro | `vitest`, `tinypool` críticas; `vite` alta; `@vitest/mocker`, `drizzle-kit`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils`, `esbuild` moderadas | 8 entradas `devOptional`. `better-auth` declara `vitest` y `drizzle-kit` como peers opcionales; por eso `--omit=dev` no los elimina del grafo. Sus funciones de pruebas/migración/build no demuestran exposición pública. |
| Sólo desarrollo según filtro | `@next/eslint-plugin-next`, `brace-expansion`, `braces`, `browserslist`, `compression`, `eslint-config-next`, `fast-glob`, `fast-uri`, `js-yaml`, `micromatch`, `serve`: 11 altas | Se excluyen del reporte filtrado. Siguen afectando herramientas/entorno de build; no son una aprobación de cadena de suministro. |

El Dockerfile hace `npm ci` completo en `deps/builder`, luego copia `.next/standalone` al runner. **El grafo npm de producción no es el inventario del runner**. No se reconstruyó ni inició Docker para revisar esto, ni se afirmó ausencia de herramientas en la imagen. Migraciones/provisión usan el target de herramientas por separado. El bloqueo no depende de probar explotabilidad: Next y sharp ya requieren resolución dirigida.

## Próximo trabajo, sujeto a alcance separado

El reporte enlaza, entre otros, [Next/Image Optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw) y [sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w). Son alertas de versión; **no se ha demostrado explotación ni compromiso de Güteli**. El apagado de pedidos/checkout no desactiva necesariamente las rutas de framework o procesamiento de imágenes.

Antes de publicar: revisar condiciones de cada advisory de runtime y versiones corregidas compatibles; aplicar cambios mínimos en una tarea autorizada, inspeccionar el runner resultante y ejecutar sólo las regresiones necesarias. Resolver también exposición de herramientas o documentar su aislamiento/no aplicabilidad con evidencia. El reporte sugiere `next@16.4.2`; no se adopta aquí como actualización probada. Algunas sugerencias cambian de major o bajan versiones (`vitest@2.0.5`, `drizzle-kit@0.18.1`, `eslint-config-next@14.2.35`): **no aplicar fixes automáticos o masivos**.

Ninguna de las 23 entradas queda remediada por esta clasificación. No levantar el bloqueo sólo porque una entrada es de desarrollo o porque el build anterior pasó.
