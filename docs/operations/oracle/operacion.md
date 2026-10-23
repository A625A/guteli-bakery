# Operación y mantenimiento

Todos los comandos de este manual son para una futura sesión autorizada, desde una release revisada. No usar el Compose raíz de desarrollo sobre producción. `ops.py` fija Docker a `unix:///var/run/docker.sock`; no usa contexto remoto, OCI ni SSH. Ejecutar con Python3.12+ del host Linux y permisos de operador; OpenSSL, cliente PostgreSQL 17 y Docker Compose se verifican antes de instalar. Esta entrega no instala herramientas.

## Comandos y límites

```sh
python3 scripts/oracle/ops.py config --env /etc/guteli/compose.env
python3 scripts/oracle/ops.py preflight
python3 scripts/oracle/ops.py schema
python3 scripts/oracle/ops.py health
python3 scripts/oracle/ops.py status
python3 scripts/oracle/ops.py logs
python3 scripts/oracle/ops.py install --sha SHA_COMPLETO
python3 scripts/oracle/ops.py update --sha SHA_COMPLETO
python3 scripts/oracle/ops.py backup --sha SHA_COMPLETO
python3 scripts/oracle/ops.py restore
```

Los cuatro últimos son simulación sin `--apply --ack AUTORIZADO_LOCAL`; no se conectan ni escriben. `config` inspecciona archivos privados; `preflight` comprueba UUID, permisos, espacio, arquitectura y sintaxis Compose; `schema` compara todos los hashes/fechas de Drizzle con el journal. `health` consulta PostgreSQL y readiness; `status` muestra estados, backup reciente y fallos. No mostrar valores de `.env` ni usar shell `source` sobre ellos.

Los comandos mutantes del host usan un lock común en el volumen de backups. Una operación en curso impide otra. Ningún comando migra, hace seed implícito, elimina copias ni borra bases/volúmenes. No usar `docker compose down -v`, prune, rm de directorios de datos ni reinicios generales como recuperación.

## Actualización manual

1. Acordar ventana y responsable, sin prometer cero interrupción. Preparar nueva release por SHA completo en directorio distinto; revisar origen, diff y checks. No auto-deploy por push.
2. Resolver/revisar digests y construir runner y builder ARM64 como en la guía. Guardar ID inmutable y SHA label. Verificar una imagen importada con checksum confiable, historial y label; no confiar sólo en la etiqueta.
3. Comparar variables requeridas, espacio libre de boot (`df -h / /var/lib/docker`), datos y backups. El script exige 5 GiB libres en cada volumen; reservar espacio adicional para build/imagen en boot. No borrar imágenes anteriores sin revisión.
4. Ejecutar `schema`. Una diferencia **bloquea**. Revisar SQL pendiente y compatibilidad forward/backward; no pasar un `--force`. Para una migración: con la release anterior, detener escritores, respaldar, aprobar SQL concreto, ejecutarlo explícitamente con tools como en la guía, verificar integridad y luego cambiar la aplicación. Si falla, mantener mantenimiento y escalar. No esconder migraciones en update.
5. Con esquema compatible/exacto, editar la configuración privada para apuntar al ID de candidato. Guardar copia privada de configuración anterior, SHA e ID anterior. Ejecutar simulación, revisar, luego `update --sha SHA --apply --ack AUTORIZADO_LOCAL`.
6. Update guarda el ID anterior, detiene app, respalda DB+imágenes, recrea servicios y espera health. Un fallo de backup intenta devolver app anterior; un fallo de despliegue da salida no cero y exige intervención. Revisar salida, no asumir éxito porque el contenedor existe.
7. Verificar HTTPS, readyz, catálogo, carrito demo, APIs403, login/MFA y archivo de imagen. Registrar versión/fecha y resultado. No modificar las banderas comerciales.

El backup de update registra el SHA de la **imagen anterior realmente instalada**, además del SHA del script operador. Un rollback de aplicación no revierte SQL. Si schema no cambió: volver al ID anterior verificado, recrear sólo app sin dependencias, comprobar health/UX. Si cambió: no iniciar binario incompatible; restaurar una copia en entorno aislado y decidir reparación forward o recuperación completa aprobada. Nunca hacer restore destructivo en producción como reacción automática.

## Backups semanales dentro de Oracle

La estrategia inicial usa un volumen separado aprobado, en la misma cuenta. Copia lógica completa de PostgreSQL 17 (`pg_dump -Fc --no-owner --no-acl`) incluye catálogo, usuarios, hashes/estado MFA, pedidos, outbox, auditoría, estados operativos y tabla Drizzle. Imágenes de `uploads` se copian junto con manifiesto de hashes, SHA de aplicación y migraciones. No incluye `.env`, contraseñas de conexión, clave de cifrado, tokens de proveedores ni acceso SSH. Aun cifradas, las copias contienen datos privados: acceso mínimo.

Para consistencia, detener todos los escritores durante dump y copia de imágenes; el stack no incluye worker de WhatsApp. No ejecutar herramientas de admin/migración/prácticas mientras se copia. Caddy puede devolver indisponibilidad breve. No activar limpieza de imágenes/retención privada de Ticket 12.

Cifrado OpenSSL AES-256-CBC + PBKDF2/200000 con autenticación HMAC-SHA256 del ciphertext usando clave derivada separada. Se comprueba HMAC **antes de descifrar**; la clave aleatoria se guarda fuera del archivo y nunca en Git. El script descifra de nuevo a temporal privado y coteja bytes antes de declarar éxito. El checksum detecta corrupción, no reemplaza el control de acceso. Proteger/respaldar las claves por canal privado autorizado, separadas del volumen de datos; su ausencia es un bloqueo de recuperación.

Retención inicial explícita: **máximo 4 copias completas**, incluidas las previas a actualizaciones. No hay borrado automático; al llenarse, la siguiente copia se rechaza y el chequeo interno señala fallo/antigüedad. El operador debe revisar cuál conservar y obtener autorización para retirar una copia antes de liberar espacio. No dejar el timer funcionando indefinidamente sin esa revisión. No confundir archivos `.enc` con los cinco backups de volumen de Oracle; éstos son otro recurso compartido. Cualquier snapshot adicional requiere cuota y autorización propias.

Una copia semanal implica hasta **siete días de pérdida** (más si falló). Estar en la misma cuenta no protege de pérdida total de cuenta; un volumen separado no equivale a copia off-host verificadamente recuperable. Se debe demostrar recuperación al perder/recrear VM, permisos y clave. Antes de pedidos reales, revisar frecuencia, retención, copia independiente y RPO/RTO; **Ticket11 sigue abierto para producción comercial**.

Primero ejecutar un backup manual con ventana autorizada. `backup` exige app detenida; `weekly-backup` controla pausa/reinicio con `finally`. La copia permanece aunque falle una comprobación posterior; no borrarla a ciegas. Fallos se registran con códigos seguros y un marcador; un éxito posterior más reciente permite reconocer recuperación.

Luego de autorización copiar las unidades a systemd, revisar rutas, `/etc/guteli/release.env` con `GUTELI_RELEASE_SHA`, zona horaria y `systemd-analyze calendar`. Habilitar timers sólo tras aprobación: domingo 03:00 Guatemala, persistente con hasta 5 min de variación; el chequeo interno corre cada 5 min. No se habilitó cron/systemd en esta tarea.

## Restauración aislada y práctica

No existe restore sobre base productiva en el script. Se exige PostgreSQL local, puerto distinto de 5432, base **nueva** `guteli_restore_*` y directorio uploads inexistente. El comando falla si la base ya existe y no tiene `--clean`, `DROP` ni force.

```sh
python3 scripts/oracle/ops.py restore --archive /ruta/privada/copia.enc \
  --key-file /ruta/privada/clave --target-url postgresql://operador@127.0.0.1:55439/guteli_restore_prueba \
  --uploads /ruta/nueva/imagenes-restauradas --apply --ack AUTORIZADO_LOCAL
```

La contraseña de restauración, si hace falta, debe resolverse por un mecanismo privado revisado; no pegar una URL con password en historial/transcript. El script limpia opciones PG heredadas para impedir redirecciones a otro host. Puerto local no prueba por sí solo aislamiento: verificar proceso/cluster nuevo y no usar túneles hacia producción.

Demostrar: hashes de dump e imágenes, número y estados de filas, claves foráneas, usuarios/roles y MFA, catálogo e imágenes servidas, pedidos PRUEBA, trabajos pendientes y tabla Drizzle. No arrancar workers ni mensajes al restaurar. Conservar evidencia y tiempo medido; esa duración local no promete RTO en Oracle. Documentar archivos faltantes o discrepancias antes de aceptar.

## Señales e incidentes

| Síntoma | Detección | Acción manual |
|---|---|---|
| VM caída/red | MonitorHTTPS falla; chequeos internos no llegan | Console/estado de VM autorizado; distinguir red de host antes de reiniciar. |
| App caída | Proxy502/503, health de app | `status`, memoria/exit code; reiniciar sólo app tras preflight. |
| DB inaccesible | `/readyz`503 y pg_isready falla | Disco, permisos, logs privados; no reiniciar DB repetidamente. |
| Almacenamiento ausente | Preflight UUID/mount falla; guard no arranca | Recuperar el montaje correcto. No crear carpetas/PGDATA de reemplazo. |
| TLS inválido/vencido | HTTPS externo falla; inspección certificado | DNS, reloj, reachability80/443 y volumen ACME. No cambiar a HTTP sensible. |
| Backup fallido/viejo | Timer failed, `last-failure`, antigüedad>8d | Espacio,4copias, clave/permisos, restore de prueba; repetir en ventana. |

UptimeRobot no puede distinguir por sí solo DB, disco, VM ni backup. Los chequeos internos dan diagnóstico seguro pero **no envían correo**. El correo externo cubre indisponibilidad pública; para fallos internos con sitio aún arriba, hace falta revisar el estado diariamente o aprobar luego una integración de alertas/heartbeat gratuita verificable. Esa cobertura sigue pendiente; no fingir que un timer local equivale a alerta externa.

No exponer diagnóstico completo en endpoint público. `/readyz` sólo devuelve `ok`/`unavailable`; `/health` heredado da disponibilidad DB sin datos privados. Consultar logs del host localmente; sanitizar cualquier extracto y no subir logs crudos de auth, URL/token, SQL ni cuerpos HTTP. No hay logs de acceso del proxy. Para disco lleno, inventariar primero; jamás eliminar pedidos/imágenes/copias por script automático.

## Dominio futuro, certificados y acceso

Tras aprobar un dominio propio: verificar titularidad, DNS A/AAAA, hostname de Caddy, BETTER_AUTH_URL, orígenes autorizados, enlaces compartidos, correoACME y configuraciones futuras de webhooks/proveedores. Emitir y comprobar TLS del nuevo host, redirigir el anterior con política revisada y sin registrar tokens. Cookies host-only no se transfieren al dominio nuevo: exigir nuevo login/MFA; no ampliar Domain a dominios ajenos. Revisar enlaces de recibos existentes y su privacidad antes de redirigir. Mantener claves de recibos estables salvo rotación aprobada. No habilitar indexación ni cobros al cambiar DNS.
