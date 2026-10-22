# Guía acompañada para Oracle Console

**Documento para ejecutar después de aprobación. No se ejecutó ninguno de estos pasos en Oracle.** Las pantallas pueden cambiar; confirmar cada resumen antes de pulsar Crear. No compartir contraseñas, OCID completos, claves privadas ni tokens en capturas.

## 1. Inspección sin cambios

1. El propietario abre su Console. Anotar nombre no sensible de tenancy, tipo de cuenta (Free/Trial/Paid), región principal y región seleccionada.
2. Abrir Governance & Administration → Limits, Quotas and Usage. Filtrar Compute/A1, Block Volume y región principal. Capturar límite, uso y disponible ocultando identificadores.
3. Abrir Compute → Instances y Storage → Block/Boot Volumes y Volume Backups en **todos los compartments**. Inventariar shapes, CPU/RAM, GB y copias. Etiquetar en la hoja qué pertenece al hackathon; no editarlo.
4. Abrir facturación/estimador en modo lectura y cotejar la etiqueta Always Free de cada recurso propuesto. No confundir límite de servicio con cuota gratuita. Tener créditos no implica costo recurrente cero.
5. Completar una hoja: disponible A1 OCPU/RAM; boot/block GB; copias usadas; región; capacidad elegible. Comparar con 1/6 + 50/50/50 GB. Si no cabe, **bloqueo**. No crear recursos ni quitar los existentes para hacer espacio.
6. La capacidad efectiva A1 sólo se confirma al asignar recursos; una cuota positiva no garantiza capacidad de host. Si aparece `Out of host capacity`, esperar o revisar una availability domain elegible; no cambiar a shape de pago.

**Punto de aprobación A:** cuenta/región, cuotas y costos, VM independiente, tres volúmenes, riesgo de reclamación y pausa operativa. No instalar hasta resolverlo.

## 2. VM, claves y red nuevas

7. Crear compartment/VCN/NSG exclusivos de Güteli si se aprueban y revisar costo de todos los componentes del asistente. Evitar asistentes que agreguen NAT o load balancers sin necesidad.
8. Generar clave Ed25519 local independiente con passphrase. Guardar clave privada con permiso 0600 y respaldo privado; subir únicamente la pública a la nueva VM. No reutilizar la del hackathon. El operador guarda las claves, no los dueños de catálogo.
9. Create compute instance: nombre identificable Güteli, Ubuntu 24.04 LTS ARM64 elegible, A1 1 OCPU/6 GB provisional, boot 50 GB. Revisar resumen, región, estimación recurrente y etiqueta elegible. Crear sólo tras A.
10. IP pública según selección revisada. SSH TCP22 sólo desde IP/CIDR autorizado. Inicialmente **sin 80/443 públicos**. Posteriormente abrir únicamente 80/443 para TLS. No abrir 3000, 5432, Docker 2375/2376 ni paneles. IPv6 debe tener reglas equivalentes o quedar sin configurar. Mantener las reglas ICMP necesarias para la red.
11. En Console comprobar VNIC/subnet/route table/Internet Gateway/NSG. En primera conexión SSH autorizada, verificar fingerprint por fuente confiable. No aceptar cambios de host key sin investigar.
12. Actualizar Ubuntu y reiniciar en ventana aprobada. SSH: usuario con clave, sin login root/password tras probar segunda sesión; `sshd -t` antes de recargar. Mantener ruta de recuperación Console. Configurar firewall sin bloquear SSH; revisar interacción Docker/DOCKER-USER, no desactivar iptables de Docker para simplificar.

## 3. Almacenamiento: detenerse ante un disco desconocido

13. Crear dos volúmenes de 50 GB aprobados, datos y backups; adjuntarlos a la VM independiente. `lsblk -f`, `findmnt` y Console deben coincidir. **No se proporciona comando de formateo automático.** Confirmar que son volúmenes nuevos vacíos antes de inicializar filesystem con guía del dispositivo elegido.
14. Montar por UUID en `/srv/guteli-data` y `/srv/guteli-backups`. Registrar UUID en configuración. Configurar `/etc/fstab` de forma revisada y probar montaje/reboot antes de datos reales. No aceptar fallback al disco boot. Mantener unidades dependientes de esos montajes.
15. En datos crear directorios `postgres` (999:999,0700), `uploads` y `caddy` (1001:1001,0700). Directorio raíz datos accesible para esos UID (0755, sin archivos sensibles directamente allí). Backups root:root 0700. Escribir marcadores no secretos `.guteli-volume`: raíz datos `guteli-data-v1`, uploads `guteli-uploads-v1`, backups `guteli-backups-v1`.
16. Revisar `findmnt -M /srv/guteli-data -o UUID` y equivalente backups. No rellenar marcadores en un directorio sin comprobar el montaje: eso invalidaría la protección. Respaldos no van en `uploads`.

## 4. Docker, release y secretos

17. Seguir [instalación oficial Docker para Ubuntu](https://docs.docker.com/engine/install/ubuntu/), usando repositorio apt firmado, arquitectura ARM64 y versiones registradas. No ejecutar scripts curl|sh. Docker Compose debe soportar `env_file.format: raw` (2.30+), `--wait` y `create_host_path`. El grupo docker equivale prácticamente a root; limitarlo al operador.
18. Crear `/etc/guteli` privado root:root 0700. Fuera de Git copiar los ejemplos `compose.env.example` y `runtime.env.example`, renombrándolos sin `.example`. Permiso 0600. Crear cuatro secretos independientes con 32 bytes aleatorios, representación hex, para DB/auth/rate/receipt; una quinta clave hex independiente para backups. Generarlos directamente en archivos privados, sin terminal/transcript. Nada del hackathon.
19. El archivo `postgres-password` debe ser **UID999, modo 0400 o 0600**, porque el contenedor no es root. El directorio padre sigue privado para el host; Docker monta el archivo. La URL DB usa ese mismo password hex, host `database`, base/usuario `guteli`. Todos los demás secretos son root0600. Guardar la clave de backup y las claves estables de autenticación/recibos en un mecanismo de recuperación privado independiente; perderlas afecta recuperación y acceso. No incluirlas en el archivo de respaldo de datos.
20. Seleccionar SHA completo revisado con historial A625A/guteli-bakery y Admin UX/Ticket 12 incluidos. **Este paso requiere autorización separada de commit/publicación** porque la entrega actual está sin commit. Descargar/verificar fuente en directorio de release nuevo; comparar SHA contra origen confiable, revisar diferencias y estado limpio. Un label de imagen es trazabilidad, no una firma de confianza por sí solo.
21. Resolver manifests oficiales de Node 22, postgres17-bookworm y Caddy 2, confirmar `linux/arm64`, guardar digests en `compose.env`. No reutilizar un tag flotante como evidencia. Construir candidato:

```sh
# Ejecutar en la raíz del release limpio aprobado; sustituir valores revisados.
docker --host unix:///var/run/docker.sock build --platform linux/arm64 \
  --build-arg NODE_IMAGE='node:22-bookworm-slim@sha256:DIGEST_REVISADO' \
  --label org.opencontainers.image.revision=SHA_COMPLETO \
  -f infra/oracle/Dockerfile --target runner -t guteli:SHA_COMPLETO .
```

Guardar el ID `sha256:...` obtenido por `docker image inspect` como GUTELI_APP_IMAGE. Construir también target `builder` con etiqueta `guteli-tools:SHA_COMPLETO` para comandos explícitos de migración/provisión. Validar arquitectura, npm/sharp, arranque y flujo completo en ARM64. No montar node_modules de macOS en Linux.

## 5. Base inicial y migraciones explícitas

22. Ejecutar `python3 scripts/oracle/ops.py config --env /etc/guteli/compose.env`. No imprime secretos. No ejecutar `docker compose config` sin `--quiet` en un transcript real: puede revelar configuración.
23. **Punto de aprobación B:** inicialización de base nueva vacía y lista SQL revisada. Revisar PG_VERSION ausente, directorio vacío, UUID y backups disponibles. Se permite el bypass del guard únicamente para este bootstrap; documentarlo. El comando oficial de Postgres inicializa al ejecutar `postgres`:

```sh
docker --host unix:///var/run/docker.sock compose --env-file /etc/guteli/compose.env \
  -f infra/oracle/compose.yaml run -d --no-deps --name guteli-bootstrap \
  --entrypoint /usr/local/bin/docker-entrypoint.sh database postgres
```

Esperar pg_isready en `guteli-bootstrap`, detener ese contenedor y retirar **sólo ese contenedor efímero**, nunca su bind mount. No ejecutar bootstrap si existe PG_VERSION ni intentar recuperar así un disco ausente. Después iniciar únicamente database con el Compose aprobado.
24. Revisar cada SQL de `drizzle/` y journal, luego ejecutar **explícitamente**, en la red privada de Compose:

```sh
docker --host unix:///var/run/docker.sock run --rm \
  --network guteli-oracle_backend --env-file /etc/guteli/runtime.env \
  guteli-tools:SHA_COMPLETO npm run db:migrate
```

No ejecutar `db:seed` sobre el catálogo real. El bootstrap de cuenta OWNER es interactivo separado (`npm run owner:create`) en el mismo tools container con `-it`, secretos privados y autorización. Ver [cuentas](lanzamiento.md). El preflight normal exige base inicializada; por diseño no sirve para saltarse este procedimiento.

## 6. HTTPS antes de administración y publicación

25. **Sin hostname/TLS públicos:** mantener NSG sin 80/443. Puede probarse con Caddy de TLS interno y túnel SSH autorizado, certificado confiado sólo para esa prueba y hostname canónico temporal resuelto localmente. El perfil público de esta entrega **no habilita ese túnel ni emite certificados internos**: requiere configurar/revisar ese perfil al hacerlo. Alternativa simple: esperar DNS y HTTPS. Nunca iniciar sesión administrativa por HTTP público usando la IP ni desactivar cookies secure/MFA.
26. **Punto de aprobación C:** registrar subdominio gratuito disponible, apuntar DNS y publicar sólo el catálogo aprobado. Revisar DuckDNS con el usuario; no asumir que el nombre deseado está libre. Configurar A a la nueva IP, no dejar AAAA obsoleto. `dig A/AAAA` y propagación desde otra red.
27. Establecer GUTELI_HOSTNAME y BETTER_AUTH_URL=https://hostname, correo ACME autorizado. Revisar Caddyfile y DNS; abrir 80/443 en NSG/firewall. No iniciar Caddy antes de autorizar emisión ACME y publicación.
28. `ops.py preflight`, `ops.py schema`, después `ops.py install --sha SHA --apply --ack AUTORIZADO_LOCAL`. Comprobar desde otra red: HTTP redirige a HTTPS canónico sin puerto8443; cadena TLS válida; `/readyz`; rechazo403 de pedidos; catálogo/carrito; login/MFA;3000/5432 cerrados. Guardar capturas sin información sensible.
29. Validar que reinicio de contenedores y reboot VM conservan imágenes/datos. Simular pérdida de montaje sólo en una copia aislada; no desmontar datos activos. Verificar que no se crea PGDATA alternativo.
30. **Punto de aprobación D:** monitor UptimeRobot HTTPS `/readyz`, frecuencia 5 min, correo elegido y prueba de aviso/recuperación. No usar recibos/token en URL de monitor. Activar timers sólo después de una restauración aislada verificada; revisar domingo 03:00 Guatemala y ventana aceptada.
