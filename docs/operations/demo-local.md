# Demo local de Güteli — operación

Preparada el 24/10/2026 desde `origin/main` **81f920185a2642b3c242354092f169f59e7fb585**, en `main-demo-duenos-20261024`. Solo esta computadora. No requiere Docker ni acceso a Oracle.

## Iniciar y detener

Desde una terminal:

```sh
cd '/ruta/al/repositorio/Guteli Bakery'
python3 scripts/local-demo/demo.py start
```

Abrir tienda: <http://127.0.0.1:3126/menu>; administrador: <http://127.0.0.1:3126/admin/login>. Usar siempre `127.0.0.1`, no cambiar a `localhost`. La primera visita compila las pantallas y puede tardar unos segundos.

```sh
python3 scripts/local-demo/demo.py credentials  # solo en pantalla privada
python3 scripts/local-demo/demo.py status
python3 scripts/local-demo/demo.py stop
```

`stop` apaga únicamente el servidor de esta demo y su PostgreSQL; conserva cuentas, productos, fotografías, pedidos y cambios de la reunión. No hace limpieza ni vuelve a cargar fixtures. No ejecutar `init` de nuevo sobre la demo preparada.

## Datos y acceso

- `python3 scripts/local-demo/demo.py status` indica la carpeta privada del runtime: cluster nuevo, uploads, contraseñas sintéticas, logs y capturas. Está fuera del árbol de código para evitar recargas de Next. `.local-demo/location.txt` guarda únicamente su ubicación y se ignora en Git. No compartir la carpeta de runtime. Es almacenamiento temporal del sistema: conservarlo hasta la revisión y no usar limpiadores de temporales; no es un respaldo duradero.
- PostgreSQL propio: `127.0.0.1:55461`, base `guteli_test`. El nombre permite reutilizar los cargadores protegidos existentes; **ninguna configuración de suites antiguas debe apuntarse a este entorno**, pues algunas reinician esa base.
- Catálogo inicial: 10 productos/4 categorías y 9 fotos del repositorio. Son referencias para revisión; no representan aprobación comercial. Los cinco pedidos `PRUEBA-*` no contienen teléfonos ni direcciones reales; todos comienzan impagos. Los ejercicios pueden cambiar sus estados y afectar las métricas.
- Cuentas para la reunión: `owner-demo@example.test` y `admin-demo@example.test`. `credentials` muestra sus contraseñas iniciales. Caducan 24 horas después de la preparación; ingresar y completar cambio de contraseña/MFA dentro de ese plazo. Si vencen antes del primer ingreso, ejecutar `python3 scripts/local-demo/demo.py renew-setup`: renueva solo los dos accesos DEMO aún sin configurar por 24 h; no cambia contraseñas/MFA ya establecidos. Después se usan la contraseña elegida y el autenticador. Conservar los códigos de recuperación. Las cuentas `browser-*` son solo de verificación.
- Fotos para los ejercicios: `public/images/products/pretzel-original.webp` y `pretzel-jalapeno.webp`. No subir documentos, fotos personales ni datos de clientes.
- Pedidos comerciales, pagos, notificaciones y webhooks WhatsApp se fuerzan a `false`. No se inicia ningún worker. El launcher rechaza archivos `.env` para no mezclar configuraciones. No modificar estos límites ni abrir puertos/túneles.

## Preparación original y verificación

El entorno ya está creado. Para reproducirlo en un checkout **nuevo**, se requiere PostgreSQL 17 y Node 22/24 en el PATH. Instalar las dependencias con `npm ci --no-audit --no-fund` usando ese Node y el lockfile versionado. `init` rechaza carpetas/puertos ocupados y no recupera ni reemplaza clusters anteriores:

```sh
GUTELI_DEMO_NODE="$(command -v node)" \
GUTELI_DEMO_PG_BIN="$(pg_config --bindir)" \
python3 scripts/local-demo/demo.py init
```

La verificación breve se ejecutó con `python3 scripts/local-demo/demo.py check`; usa cuentas técnicas y **modifica fixtures** (producto, promoción y estado PRUEBA). No es requisito repetirla al iniciar ni reemplaza la revisión de dueños. Los resultados están en `results.json` dentro de la carpeta que muestra `status`; los hallazgos y la evidencia reutilizada se resumen en `demo-local-resultado.md`.

Esta demo usa `next dev` con HTTP de loopback. No prueba HTTPS público, cookies de producción, operación Oracle ni dispositivos externos. Al iniciar, Next puede regenerar `next-env.d.ts` con rutas `.next/dev`; es un archivo generado, no una corrección funcional.

El respaldo en GitHub contiene únicamente los scripts, la configuración, la prueba breve y estas guías. No contiene el runtime ni sus datos. `credentials` lee las contraseñas generadas de `state.json` privado y las muestra solo al invocarlo explícitamente: no redirigir su salida a archivos, logs o mensajes. Conservar la carpeta temporal existente para la reunión; clonar la rama no recupera sus datos ni sus cuentas.
