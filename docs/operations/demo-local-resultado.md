# Resultado — demo local para dueños, 24/10/2026

**Demo preparada desde `origin/main` 81f920185a2642b3c242354092f169f59e7fb585**, en la rama independiente `main-demo-duenos-20261024`. Un agente. La preparación inicial terminó sin commit ni push. Sin cambios funcionales en `src/`, merge, Oracle, hackathon, recursos pagos ni exposición pública. Main local `061f036` y los demás worktrees se conservaron.

## Cierre para GitHub — 24/10/2026

Autorizados commit y push exclusivamente a `origin/main-demo-duenos-20261024`, sin force ni merge/push a main. Se incluyen nueve archivos: launcher y seed de cuentas, configuración y prueba breve, `.gitignore`, tres guías/informes y checkpoint. Se revisa el contenido staged por lista explícita y se compara con los valores privados del runtime sin mostrarlos ni copiarlos. No se versionan credenciales, base, uploads, resultados crudos, capturas, logs ni archivos ajenos.

Se reutilizan los 4/4 recorridos y la comprobación de persistencia anteriores. La revisión de cierre se limita a sintaxis Python, ESLint/format de los archivos TS de demo, diff y privacidad del commit. No se arranca ni reinicializa PostgreSQL y no se repiten suites, auditorías o builds. Los únicos ajustes posteriores al ensayo son mensajes de diagnóstico que ahora apuntan al runtime correcto y documentación portable/de cierre; no cambia el comportamiento de la demo. El SHA remoto final se verifica después del push y se entrega en la respuesta de cierre.

Comprobaciones de cierre aprobadas: sintaxis Python, ESLint dirigido y formato de TS/documentos. Una prueba aislada de `credentials` con valores simulados confirmó que muestra solo los accesos OWNER/ADMIN previstos, sin mostrar los secretos simulados de DB/Auth ni leer credenciales reales. El runtime sigue detenido; conserva los once archivos de uploads y los resultados previos (4 esperados, 0 fallos, 0 intermitentes).

## Base y evidencia reutilizada

- Git remoto consultado y actualizado: `81f9201` integra `c4ef532` (fotografías), `18703b1` (Admin UX2.0) y `986850c` (remediación). La diferencia funcional de `src/`, package y lock frente a `986850c` es vacía. La referencia local estaba atrasada; no se aplicó cherry-pick ni una nueva integración.
- Package/lock coinciden con los SHA256 de `artifacts/oracle-preparation/ticket-03/remediation-evidence.json`: `66cb7d7067426d04b815928fcb424e002e8e04573c24e90e68e9c770fef3a548` y `acba6cb52eb8ac9d76a0297a972bbb5d51b85224f1367454178237f5b426f4f8`.
- Se reutilizó el reporte del24/10: audit0/0,100 unitarias,40 integración,5 navegador y validación ARM64. Se consultaron también los resultados de Tickets04/05 y Admin UX; sus suites se solapan y no se suman. **No se repitió audit, build de producción/ARM64, Docker ni suites generales.** El audit es evidencia fechada, no garantía de avisos futuros.
- `npm ci --no-audit --no-fund` instaló el lock exacto con Node24.22.1; Next16.4.2. El Node23 del sistema no es el runtime de la demo.

## Recorridos ejecutados en el entorno nuevo

Pasada final: **4/4 Playwright, 1.1 minutos, un worker, sin reintentos automáticos**.

| Recorrido                    | Resultado observado                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo/carrito,1440 y390px | Fotografías cargadas; agregar/cambiar cantidad; subtotal y persistencia al recargar; aviso demostración; sin formulario personal, envío de pedido ni pago habilitado.                                               |
| OWNER/MFA y catálogo         | Cambio inicial de contraseña y alta MFA; rechazo sin MFA; crear producto con foto, editar precio, reemplazar/quitar/volver a agregar foto; persistencia al recargar y visibilidad pública. OWNER accede a usuarios. |
| Promociones                  | Crear10%, comprobar etiqueta y precio Q15→Q13.50 en catálogo; deshabilitar al terminar.                                                                                                                             |
| Pedido PRUEBA                | Buscar referencia exacta incluso con sufijo ingresado en mayúsculas; abrir detalle; avanzar RECIBIDO→CONFIRMADO y verificar historial/persistencia.                                                                 |
| ADMIN/MFA                    | Catálogo móvil sin desbordamiento; acceso permitido a productos y403 en usuarios. OWNER y ADMIN cierran sesión y vuelven a ingresar con desafío MFA real.                                                           |
| Límites comerciales          | Cuatro POST públicos devuelven403 `COMMERCIAL_DEMO`; administración anónima401. Persisten solo5 PRUEBA, todos `UNPAID`, con teléfono ficticio; outbox y recibos WhatsApp0.                                          |

Se revisó visualmente la captura del catálogo ADMIN a390px. La prueba móvil usa emulación de tamaño, no un teléfono físico. Los errores/reintentos de carga y otros controles de imágenes conservan la evidencia previa de Ticket05; no se repitió toda esa batería.

Verificaciones adicionales: ESLint de los tres archivos TS nuevos, TypeScript sin build, sintaxis Python y `git diff --check`. Las cuentas de reunión OWNER/ADMIN están separadas de los fixtures browser y conservan su alta MFA pendiente. Se verificó renovación de sus credenciales iniciales por24h, sin alterar cuentas ya configuradas.

Apagado/reinicio verificado: el hash de productos, registros de fotografías, promociones, pedidos e ítems permaneció idéntico (`a4de6f01c5af82c015e0433038b93662b6b3f04f0cdddb4a6d1a65e5aba09d6f`); readiness y una fotografía respondieron200 tras reiniciar. Confirmados11 fotos activas,0 promociones habilitadas,5 PRUEBA impagos y0 outbox/recibos. **Estado de entrega: ambos servicios detenidos, datos conservados.**

## Incidencias nuevas de preparación

No se encontró un defecto nuevo de la aplicación que requiriera cambiar `src/`.

1. El launcher inicial usó `TRUSTED_PROXY_HOPS=0`; la política existente rechaza el ingreso fuera de pruebas con ese valor. Se corrigió a1, como los harnesses locales previos, exclusivamente en loopback.
2. El runtime dentro del repositorio provocaba recargas continuas de Next durante el ingreso, reproducidas mediante eventos de navegación/Fast Refresh. Se movió **solo este runtime nuevo**, conservando datos, a una carpeta temporal privada fuera del árbol observado. La pasada final quedó estable.
3. La comprobación de puertos del launcher rechazaba un reinicio inmediato por `TIME_WAIT` aun sin listeners. Se añadió `SO_REUSEADDR` al sondeo; se conserva rechazo de puertos ocupados.
4. El harness buscaba “Mi cuenta” desde Productos/Pedido; esa sección está en Resumen. Se corrigió la navegación del test. Los resultados fallidos se conservan como diagnóstico local; no se presentaron como fallos del producto.

El intento inicial de instalar dependencias quedó bloqueado por DNS de la sandbox; se detuvo y completó con acceso de red y Node24. No se actualizó el lockfile ni se ejecutó audit.

## Entorno y entrega

- PostgreSQL17 nuevo en127.0.0.1:55461 y Next dev en127.0.0.1:3126, comprobados con `lsof`. Los dos servicios se detienen con el comando de la guía. No hay worker, proxy externo ni túnel.
- La ubicación privada está en `.local-demo/location.txt`; contiene base, uploads, secretos ficticios, logs, capturas, manifiesto PRUEBA y JSON de resultados. Está fuera del repositorio y no se publica. Es almacenamiento temporal del sistema: conservarlo para la reunión; no usar limpiadores de temporales ni tratarlo como respaldo permanente.
- Quedaron10 productos base más2 productos PRUEBA de las verificaciones, dos promociones de ensayo deshabilitadas y cinco pedidos PRUEBA. No se purgaron datos para ocultar los ejercicios. Nuditos conserva su imagen pendiente/placeholder.
- [Comandos y accesos](demo-local.md); [guía de una página](demo-local-duenos.md). Las contraseñas se consultan localmente con `credentials`, no se incluyen en este informe.

## Pendiente antes de una demostración pública

Aceptación manual de los dueños de contenido, fotos/derechos, precios/presentaciones, disponibilidad, promociones, políticas, contacto/horarios/entregas, personas/roles y uso de autenticadores reales. Probar sus dispositivos y registrar observaciones y aprobación.

Luego se requiere autorización separada para integrar el SHA aprobado en main y desplegarlo en Oracle; comprobar cuota/uso/costo/capacidad independiente del hackathon, hostname, DNS/TLS, firewall, instalación, cuentas reales y operación/backup/restore en el destino. Nada de eso se verificó aquí. Esta demo HTTP de desarrollo no valida producción ni autoriza comercio, cobros o WhatsApp.
