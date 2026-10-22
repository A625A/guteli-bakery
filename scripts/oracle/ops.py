#!/usr/bin/env python3
"""Local host operations. No OCI/SSH client, no automatic migration, no deletion."""
import argparse
import fcntl
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[2]
COMPOSE = ROOT / 'infra/oracle/compose.yaml'


def need(condition, message):
    if not condition:
        raise RuntimeError(message)


def run(args, **kwargs):
    if args[0] == 'docker':
        args = ['docker', '--host', 'unix:///var/run/docker.sock', *args[1:]]
        local_env = dict(kwargs.get('env', os.environ))
        for name in list(local_env):
            if name.startswith('DOCKER_'): del local_env[name]
        kwargs['env'] = local_env
    # Never echo command output, credentials or raw Docker/SQL errors on failure.
    result = subprocess.run(args, stderr=subprocess.PIPE, **kwargs)
    need(result.returncode == 0, 'OPERACION_FALLIDA: revisar diagnóstico local privado')
    return result


def capture(args, **kwargs):
    return run(args, stdout=subprocess.PIPE, **kwargs).stdout.decode().strip()


def private_file(path):
    path = Path(path)
    need(path.is_absolute() and path.is_file() and not path.is_symlink(), 'ARCHIVO_PRIVADO_INVALIDO')
    need(path.stat().st_mode & 0o077 == 0, 'PERMISOS_PRIVADOS_REQUERIDOS')
    need(not path.is_relative_to(ROOT), 'SECRETOS_FUERA_DE_GIT')
    return path


def read_env(path):
    result = {}
    for line in private_file(path).read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        key, sep, value = line.partition('=')
        need(sep and re.fullmatch('[A-Z][A-Z0-9_]*', key) and key not in result, 'FORMATO_ENV_INVALIDO')
        need(value and not any(c in value for c in '\x00\r\n\"\''), 'VALOR_ENV_INVALIDO')
        need('REPLACE_' not in value, 'CONFIGURACION_INCOMPLETA')
        result[key] = value
    return result


def compose(env, *args, **kwargs):
    # Keep the shell environment from overriding reviewed Compose interpolation.
    clean = {k: v for k, v in os.environ.items() if not k.startswith(('GUTELI_', 'COMPOSE_', 'ACME_'))}
    clean.update(env)
    return run(['docker', 'compose', '--project-name', 'guteli-oracle', '--env-file', '/dev/null', '-f', str(COMPOSE), *args], env=clean, **kwargs)


def configuration(path):
    env = read_env(path)
    runtime = read_env(env['GUTELI_RUNTIME_ENV'])
    need(runtime.get('BETTER_AUTH_URL') == 'https://' + env['GUTELI_HOSTNAME'], 'ORIGEN_INVALIDO')
    need(re.fullmatch(r'[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?', env['GUTELI_HOSTNAME']) and '.' in env['GUTELI_HOSTNAME'], 'HOST_INVALIDO')
    need(runtime.get('NODE_ENV') == 'production' and runtime.get('TRUSTED_PROXY_HOPS') == '1' and runtime.get('UPLOADS_ROOT') == '/app/uploads', 'RUNTIME_INVALIDO')
    for flag in ('COMMERCIAL_ORDERS_ENABLED', 'PAYMENTS_ENABLED', 'WHATSAPP_NOTIFICATIONS_ENABLED', 'WHATSAPP_WEBHOOKS_ENABLED'):
        need(runtime.get(flag) == 'false', 'DEMO_DEBE_ESTAR_CERRADA')
    secrets = [runtime[k] for k in ('BETTER_AUTH_SECRET', 'RATE_LIMIT_SECRET', 'RECEIPT_TOKEN_SECRET')]
    password_file = private_file(env['GUTELI_POSTGRES_PASSWORD_FILE'])
    need(password_file.stat().st_uid == 999, 'SECRETO_POSTGRES_REQUIERE_UID_999')
    password = password_file.read_text().strip()
    secrets.append(password)
    need(all(re.fullmatch('[a-f0-9]{64,}', s) for s in secrets) and len(set(secrets)) == 4, 'SECRETOS_HEX_INDEPENDIENTES_REQUERIDOS')
    need(runtime['DATABASE_URL'] == f'postgresql://guteli:{password}@database:5432/guteli', 'DATABASE_URL_INVALIDA')
    key = private_file(env['GUTELI_BACKUP_KEY_FILE']).read_bytes().strip()
    need(re.fullmatch(b'[a-f0-9]{64,}', key) and key.decode() not in secrets, 'CLAVE_BACKUP_INVALIDA')
    need(re.fullmatch(r'sha256:[a-f0-9]{64}', env['GUTELI_APP_IMAGE']), 'APP_ID_INMUTABLE_REQUERIDO')
    for name, prefix in [('POSTGRES', 'postgres:17'), ('CADDY', 'caddy:2'), ('NODE', 'node:22')]:
        image = env['GUTELI_' + name + '_IMAGE']
        need(image.startswith(prefix) and re.search(r'@sha256:[a-f0-9]{64}$', image), 'DIGEST_REQUERIDO')
    return env


def mounted(path, expected_uuid, marker):
    path = Path(path)
    need(path.is_absolute() and path == path.resolve() and path != Path('/'), 'RUTA_DE_MONTAJE_INVALIDA')
    need(os.path.ismount(path), 'VOLUMEN_NO_MONTADO')
    actual = capture(['findmnt', '-rn', '-M', str(path), '-o', 'UUID'])
    need(actual == expected_uuid, 'UUID_DE_VOLUMEN_INCORRECTO')
    need((path / '.guteli-volume').read_text().strip() == marker, 'MARCADOR_DE_VOLUMEN_INCORRECTO')
    need(shutil.disk_usage(path).free >= 5 * 1024**3, 'ESPACIO_LIBRE_MENOR_A_5_GIB')
    return path


def preflight(env):
    data = mounted(env['GUTELI_DATA_ROOT'], env['GUTELI_DATA_UUID'], 'guteli-data-v1')
    backup = mounted(env['GUTELI_BACKUP_ROOT'], env['GUTELI_BACKUP_UUID'], 'guteli-backups-v1')
    need(data != backup and env['GUTELI_DATA_UUID'] != env['GUTELI_BACKUP_UUID'], 'BACKUP_REQUIERE_VOLUMEN_SEPARADO')
    need((data / 'uploads/.guteli-volume').read_text().strip() == 'guteli-uploads-v1', 'UPLOADS_NO_PREPARADO')
    for folder, uid in [('uploads', 1001), ('caddy', 1001), ('postgres', 999)]:
        path = data / folder
        need(path.is_dir() and not path.is_symlink() and path.stat().st_uid == uid, 'PROPIETARIO_DE_DATOS_INVALIDO')
    need((data / 'postgres/PG_VERSION').read_text().strip() == '17', 'POSTGRES_NO_INICIALIZADO')
    compose(env, 'config', '--quiet', stdout=subprocess.DEVNULL)
    need(capture(['docker', 'info', '--format', '{{.Architecture}}']) in ('aarch64', 'arm64'), 'HOST_DOCKER_NO_ARM64')
    need(shutil.disk_usage(ROOT).free >= 5 * 1024**3, 'ESPACIO_RELEASE_INSUFICIENTE')
    docker_root = Path(capture(['docker', 'info', '--format', '{{.DockerRootDir}}']))
    need(docker_root.is_absolute() and docker_root.is_dir() and shutil.disk_usage(docker_root).free >= 5 * 1024**3, 'ESPACIO_DOCKER_INSUFICIENTE')
    return data, backup


def migration_manifest():
    journal = json.loads((ROOT / 'drizzle/meta/_journal.json').read_text())
    return [{'hash': hashlib.sha256((ROOT / 'drizzle' / (e['tag'] + '.sql')).read_bytes()).hexdigest(), 'created_at': str(e['when'])} for e in journal['entries']]


def schema_check(env):
    sql = "SELECT coalesce(json_agg(t ORDER BY created_at), '[]') FROM (SELECT hash, created_at::text FROM drizzle.__drizzle_migrations) t"
    result = compose(env, 'exec', '-T', 'database', 'psql', '-XAt', '-U', 'guteli', '-d', 'guteli', '-c', sql, stdout=subprocess.PIPE)
    need(json.loads(result.stdout) == migration_manifest(), 'ESQUEMA_DIFIERE: revisar y autorizar migraciones por separado')


def release(sha):
    need(sha and re.fullmatch('[a-f0-9]{40}', sha), 'SHA_COMPLETO_REQUERIDO')
    need(capture(['git', '-C', str(ROOT), 'rev-parse', 'HEAD']) == sha, 'SHA_NO_COINCIDE')
    need(not capture(['git', '-C', str(ROOT), 'status', '--porcelain', '--untracked-files=all']), 'RELEASE_DEBE_ESTAR_LIMPIA')
    return sha


def health(env):
    compose(env, 'exec', '-T', 'database', 'pg_isready', '-U', 'guteli', '-d', 'guteli', stdout=subprocess.DEVNULL)
    compose(env, 'exec', '-T', 'app', 'node', '-e', "fetch('http://127.0.0.1:3000/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))", stdout=subprocess.DEVNULL)
    schema_check(env)
    print('DATABASE_APP_SCHEMA_OK')


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def mac(path, key):
    h = hmac.new(hashlib.sha256(b'guteli-backup-auth-v1\x00' + key).digest(), digestmod='sha256')
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def seal(source, destination, keyfile):
    need(not destination.exists(), 'RESPALDO_YA_EXISTE')
    run(['openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-salt', '-in', str(source), '-out', str(destination), '-pass', 'file:' + str(keyfile)], stdout=subprocess.DEVNULL)
    destination.chmod(0o600)
    destination.with_suffix('.hmac').write_text(mac(destination, Path(keyfile).read_bytes().strip()))


def unseal(source, destination, keyfile):
    expected = source.with_suffix('.hmac').read_text().strip()
    need(hmac.compare_digest(expected, mac(source, Path(keyfile).read_bytes().strip())), 'BACKUP_INTEGRIDAD_INVALIDA')
    run(['openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-in', str(source), '-out', str(destination), '-pass', 'file:' + str(keyfile)], stdout=subprocess.DEVNULL)


def backup(env, sha):
    data, destination = preflight(env)
    schema_check(env)
    need(capture(['docker', 'inspect', '--format', '{{.State.Running}}', compose_id(env, 'app')]) == 'false', 'DETENER_APP_ANTES_DEL_BACKUP')
    # No workers exist in this deployment. All application writers must stay stopped.
    need(len(list(destination.glob('*.enc'))) < 4, 'RETENCION_LLENA: revisar 4 copias, no se borra automáticamente')
    size = sum(p.stat().st_size for p in (data / 'uploads').rglob('*') if p.is_file())
    dbsize = compose(env, 'exec', '-T', 'database', 'psql', '-XAt', '-U', 'guteli', '-d', 'guteli', '-c', 'SELECT pg_database_size(current_database())', stdout=subprocess.PIPE)
    need(shutil.disk_usage(destination).free > 5 * (size + int(dbsize.stdout)) + 1024**3, 'ESPACIO_BACKUP_INSUFICIENTE')
    with tempfile.TemporaryDirectory(prefix='.guteli-backup-', dir=destination) as temp:
        folder = Path(temp)
        with (folder / 'database.dump').open('wb') as output:
            compose(env, 'exec', '-T', 'database', 'pg_dump', '-U', 'guteli', '-d', 'guteli', '-Fc', '--no-owner', '--no-acl', stdout=output)
        files = {}
        for file in (data / 'uploads').rglob('*'):
            need(not file.is_symlink(), 'UPLOAD_SYMLINK_NO_PERMITIDO')
            if file.is_file(): files[str(file.relative_to(data))] = digest(file)
        running_image = capture(['docker', 'inspect', '--format', '{{.Image}}', compose_id(env, 'app')])
        running_sha = capture(['docker', 'image', 'inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}', running_image])
        need(re.fullmatch('[a-f0-9]{40}', running_sha), 'BACKUP_RELEASE_DESCONOCIDA')
        manifest = {'format': 1, 'sha': running_sha, 'operator_sha': sha, 'image': running_image, 'created_at': int(time.time()), 'migrations': migration_manifest(), 'database_sha256': digest(folder / 'database.dump'), 'files': files}
        (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2))
        with tarfile.open(folder / 'backup.tar', 'w') as tar:
            tar.add(folder / 'database.dump', arcname='database.dump')
            tar.add(folder / 'manifest.json', arcname='manifest.json')
            tar.add(data / 'uploads', arcname='uploads')
        target = destination / (time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '.enc')
        seal(folder / 'backup.tar', target, private_file(env['GUTELI_BACKUP_KEY_FILE']))
        # Decrypt and verify the exact encrypted copy before declaring success.
        unseal(target, folder / 'verified.tar', env['GUTELI_BACKUP_KEY_FILE'])
        need(digest(folder / 'backup.tar') == digest(folder / 'verified.tar'), 'BACKUP_VERIFICACION_FALLIDA')
        (destination / 'last-success.json').write_text(json.dumps({'timestamp': int(time.time()), 'sha': sha, 'archive': target.name}))
    print('BACKUP_CIFRADO_VERIFICADO')


def compose_id(env, service):
    result = compose(env, 'ps', '-aq', service, stdout=subprocess.PIPE)
    value = result.stdout.decode().strip()
    need(bool(re.fullmatch('[a-f0-9]{12,64}', value)), 'CONTENEDOR_NO_ENCONTRADO')
    return value


def require_running_app(env):
    running = capture(['docker', 'inspect', '--format', '{{.State.Running}}', compose_id(env, 'app')])
    need(running == 'true', 'APP_DETENIDA: respetar mantenimiento, no ejecutar backup semanal')


def require_new_install(env):
    result = compose(env, 'ps', '-aq', 'app', stdout=subprocess.PIPE)
    need(not result.stdout.strip(), 'INSTALACION_EXISTENTE: usar update con respaldo previo')


def restore(source, keyfile, target_url, uploads):
    # Only a new local database on a non-default isolated port. Never drops a database.
    url = urlparse(target_url or '')
    need(url.scheme == 'postgresql' and url.hostname in ('127.0.0.1', 'localhost') and url.port and url.port != 5432 and re.fullmatch('/guteli_restore_[a-z0-9_]+', url.path) and not url.query and not url.fragment, 'RESTAURACION_SOLO_EN_DESTINO_LOCAL_AISLADO')
    target = Path(uploads).absolute()
    need(not target.exists(), 'UPLOADS_DESTINO_DEBE_SER_NUEVO')
    env = os.environ.copy()
    # Avoid ambient service options redirecting local connections.
    for k in list(env):
        if k.startswith('PG'): del env[k]
    env.update(PGHOST=url.hostname, PGPORT=str(url.port), PGUSER=unquote(url.username or ''), PGPASSWORD=unquote(url.password or ''), PGDATABASE=url.path[1:])
    with tempfile.TemporaryDirectory(prefix='guteli-restore-') as temp:
        folder = Path(temp)
        unseal(Path(source), folder / 'backup.tar', private_file(keyfile))
        with tarfile.open(folder / 'backup.tar') as tar:
            for member in tar.getmembers():
                path = Path(member.name)
                need(not path.is_absolute() and '..' not in path.parts and (member.isfile() or member.isdir()) and (member.name in ('database.dump', 'manifest.json') or path.parts[0] == 'uploads'), 'ARCHIVO_BACKUP_INVALIDO')
            tar.extractall(folder, filter='data')
        manifest = json.loads((folder / 'manifest.json').read_text())
        need(digest(folder / 'database.dump') == manifest['database_sha256'], 'DUMP_CORRUPTO')
        for file, expected in manifest['files'].items():
            need(file.startswith('uploads/') and '..' not in Path(file).parts and digest(folder / file) == expected, 'IMAGEN_CORRUPTA')
        run(['createdb', env['PGDATABASE']], env=env, stdout=subprocess.DEVNULL)  # fails if target exists
        run(['pg_restore', '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '-d', env['PGDATABASE'], str(folder / 'database.dump')], env=env, stdout=subprocess.DEVNULL)
        shutil.copytree(folder / 'uploads', target)
        print('RESTAURACION_AISLADA_OK: validar catálogo, cuentas, pedidos y trabajos antes de aceptar')


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['config', 'preflight', 'schema', 'install', 'update', 'backup', 'weekly-backup', 'health', 'status', 'logs', 'restore'])
    parser.add_argument('--env', default='/etc/guteli/compose.env')
    parser.add_argument('--sha')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--ack', default='')
    parser.add_argument('--archive')
    parser.add_argument('--key-file')
    parser.add_argument('--target-url')
    parser.add_argument('--uploads')
    args = parser.parse_args()
    mutation = args.action in ('install', 'update', 'backup', 'weekly-backup', 'restore')
    if mutation and not args.apply:
        print('SIMULACION: validar configuración, montaje y esquema; ventana manual, copia previa; sin migraciones ni borrado. Use --apply --ack AUTORIZADO_LOCAL tras revisión.')
        return
    if mutation: need(args.ack == 'AUTORIZADO_LOCAL', 'AUTORIZACION_EXPLICITA_REQUERIDA')
    if args.action == 'restore':
        restore(args.archive, args.key_file, args.target_url, args.uploads)
        return
    env = configuration(args.env)
    if args.action == 'config':
        print('CONFIGURACION_OK'); return
    data, destination = preflight(env)
    if mutation:
        lock_fd = os.open(destination / '.operations.lock', os.O_CREAT | os.O_RDWR, 0o600)
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    if args.action == 'preflight': print('PREFLIGHT_OK')
    elif args.action == 'schema': schema_check(env); print('ESQUEMA_EXACTO_OK')
    elif args.action == 'health': health(env)
    elif args.action == 'logs':
        # No raw logs: private auth adapters may emit unsafe error text.
        print('Consultar journalctl -u guteli-* localmente; no exportar logs crudos. status muestra sólo estado y health.')
    elif args.action == 'status':
        for name in ('app', 'database', 'proxy'):
            cid = compose_id(env, name)
            print(name + ': ' + capture(['docker', 'inspect', '--format', '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}', cid]))
        fresh = json.loads((destination / 'last-success.json').read_text())
        need(time.time() - fresh['timestamp'] < 8 * 86400, 'BACKUP_VENCIDO')
        failure = destination / 'last-failure'
        need(not failure.exists() or int(failure.read_text()) <= fresh['timestamp'], 'BACKUP_FALLIDO')
        print('BACKUP_RECIENTE')
    else:
        sha = release(args.sha)
        if args.action == 'backup': backup(env, sha); return
        if args.action == 'weekly-backup':
            require_running_app(env)
            compose(env, 'stop', 'app', stdout=subprocess.DEVNULL)
            try:
                backup(env, sha)
            except Exception:
                (destination / 'last-failure').write_text(str(int(time.time())))
                raise
            finally:
                compose(env, 'start', '--wait', '--wait-timeout', '120', 'app', stdout=subprocess.DEVNULL)
            health(env); return
        if args.action == 'install': require_new_install(env)
        schema_check(env)
        image = json.loads(capture(['docker', 'image', 'inspect', env['GUTELI_APP_IMAGE']]))[0]
        need(image['Architecture'] == 'arm64' and image['Config'].get('Labels', {}).get('org.opencontainers.image.revision') == sha, 'IMAGEN_O_SHA_INVALIDO')
        if args.action == 'update':
            old = capture(['docker', 'inspect', '--format', '{{.Image}}', compose_id(env, 'app')])
            (destination / ('previous-' + str(int(time.time())) + '.json')).write_text(json.dumps({'image': old, 'candidate': sha}))
            compose(env, 'stop', 'app', stdout=subprocess.DEVNULL)
            try: backup(env, sha)
            except Exception:
                compose(env, 'start', '--wait', '--wait-timeout', '120', 'app', stdout=subprocess.DEVNULL)
                raise
        # No build, migration or schema mutation hidden in this step.
        compose(env, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '120', stdout=subprocess.DEVNULL)
        health(env)
        print('SERVICIO_VERIFICADO_LOCALMENTE_EN_ESTE_HOST')


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        # RuntimeError messages are authored safe codes, never provider diagnostics.
        print(str(error) if isinstance(error, RuntimeError) else 'OPERACION_FALLIDA_SIN_DETALLES_SENSIBLES', file=sys.stderr)
        sys.exit(1)
