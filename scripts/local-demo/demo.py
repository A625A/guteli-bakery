#!/usr/bin/env python3
"""Local-only owner demo. Never uses an existing PostgreSQL cluster or .env."""
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

REPO = Path(__file__).resolve().parents[2]
META = REPO / '.local-demo'
LOCATION = META / 'location.txt'
ROOT = Path(LOCATION.read_text().strip()) if LOCATION.exists() else META
STATE = ROOT / 'state.json'
DB_PORT, APP_PORT = 55461, 3126
URL = f'http://127.0.0.1:{APP_PORT}'


def run(args, env, **kwargs):
    return subprocess.run([str(a) for a in args], cwd=REPO, env=env,
                          check=True, **kwargs)


def free_port(port):
    with socket.socket() as sock:
        # TIME_WAIT from this demo's prior shutdown is not an active listener.
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('127.0.0.1', port))


def load():
    state = json.loads(STATE.read_text())
    if state['repo'] != str(REPO) or state['marker'] != 'guteli-owner-demo-v1':
        raise RuntimeError('Estado de demo ajeno; no se modifica.')
    if ROOT.is_symlink() or (ROOT / 'pgdata').is_symlink():
        raise RuntimeError('No se admiten enlaces a clusters existentes.')
    return state


def environment(state):
    env = {k: os.environ[k] for k in ('HOME', 'TMPDIR', 'LANG') if k in os.environ}
    env.update({
        'PATH': f"{Path(state['node']).parent}:{state['pg']}:/opt/homebrew/bin:/usr/bin:/bin",
        'NODE_ENV': 'development', 'NEXT_TELEMETRY_DISABLED': '1',
        'DATABASE_URL': f"postgresql://guteli_demo:{state['db_password']}@127.0.0.1:{DB_PORT}/guteli_test",
        'BETTER_AUTH_URL': URL, 'BETTER_AUTH_SECRET': state['auth_secret'],
        'RATE_LIMIT_SECRET': state['rate_secret'], 'RECEIPT_TOKEN_SECRET': state['receipt_secret'],
        # Same loopback-only Next development boundary as the existing photo demo.
        'UPLOADS_ROOT': str(ROOT / 'uploads'), 'TRUSTED_PROXY_HOPS': '1',
        'NEXT_PUBLIC_DEMO_MODE': 'true', 'COMMERCIAL_ORDERS_ENABLED': 'false',
        'PAYMENTS_ENABLED': 'false', 'WHATSAPP_NOTIFICATIONS_ENABLED': 'false',
        'WHATSAPP_WEBHOOKS_ENABLED': 'false', 'WHATSAPP_ACCOUNT_READY': 'false',
        'WHATSAPP_OWNER_CONSENT_CONFIRMED': 'false',
        'PGPASSWORD': state['db_password'], 'GUTELI_LOCAL_DEMO_ROOT': str(ROOT),
        'GUTELI_PRACTICE_AUTHORIZATION': 'guteli-practica-v1',
        'GUTELI_PRACTICE_MANIFEST': str(Path(state['socket']) / 'practice-manifest.json'),
    })
    env['DATABASE_URL_TEST'] = env['DATABASE_URL']
    return env


def pg(state, *args, **kwargs):
    return run([Path(state['pg']) / 'pg_ctl', '-D', ROOT / 'pgdata', *args],
               environment(state), **kwargs)


def db_running(state):
    return subprocess.run([str(Path(state['pg']) / 'pg_ctl'), '-D', str(ROOT / 'pgdata'), 'status'],
                          capture_output=True).returncode == 0


def start_db(state):
    if not db_running(state):
        free_port(DB_PORT)
        Path(state['socket']).mkdir(mode=0o700, exist_ok=True)
        pg(state, '-l', ROOT / 'postgres.log', '-w', 'start')


def stop_app():
    pid_file = ROOT / 'app.pid'
    if not pid_file.exists():
        return
    pid = int(pid_file.read_text())
    result = subprocess.run(['ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True)
    if result.returncode == 0:
        if str(REPO / 'node_modules/next/dist/bin/next') not in result.stdout:
            raise RuntimeError('PID reutilizado; no se detiene un proceso ajeno.')
        os.killpg(pid, signal.SIGTERM)
        for _ in range(100):
            with socket.socket() as sock:
                if sock.connect_ex(('127.0.0.1', APP_PORT)) != 0:
                    break
            time.sleep(0.1)
        else:
            raise RuntimeError('La aplicación todavía escucha; revisar app.log.')
    pid_file.unlink()


def main():
    global ROOT, STATE
    command = sys.argv[1] if len(sys.argv) > 1 else 'status'
    os.umask(0o077)
    if command == 'init':
        # Fail before writing anything when occupied. Never reset/re-seed a demo.
        free_port(DB_PORT)
        free_port(APP_PORT)
        if list(REPO.glob('.env')) or any(p.name != '.env.example' for p in REPO.glob('.env.*')):
            raise RuntimeError('Hay archivos .env: revisar antes de crear la demo aislada.')
        node = os.environ.get('GUTELI_DEMO_NODE') or shutil.which('node')
        pg_bin = os.environ.get('GUTELI_DEMO_PG_BIN') or str(Path(shutil.which('initdb') or '/missing/initdb').parent)
        if not node or not (Path(pg_bin) / 'initdb').exists():
            raise RuntimeError('Se requieren Node 22/24 y PostgreSQL nativos.')
        version = subprocess.check_output([node, '-p', 'process.versions.node']).decode().strip()
        if int(version.split('.')[0]) not in (22, 24):
            raise RuntimeError('Utilizar Node 22 o 24 para esta demo.')
        META.mkdir(mode=0o700)  # Deliberately refuses an existing demo.
        socket_dir = tempfile.mkdtemp(prefix='guteli-owner-demo-')
        ROOT = Path(socket_dir) / 'runtime'
        ROOT.mkdir(mode=0o700)
        STATE = ROOT / 'state.json'
        LOCATION.write_text(str(ROOT) + '\n')
        state = {'repo': str(REPO), 'marker': 'guteli-owner-demo-v1', 'node': node,
                 'pg': pg_bin, 'socket': socket_dir,
                 **{k: secrets.token_hex(32) for k in ('db_password', 'auth_secret', 'rate_secret', 'receipt_secret')},
                 'owner_password': secrets.token_urlsafe(20), 'admin_password': secrets.token_urlsafe(20)}
        STATE.write_text(json.dumps(state, indent=2))
        env = environment(state)
        password_file = ROOT / 'pg-password'
        password_file.write_text(state['db_password'])
        run([Path(pg_bin) / 'initdb', '-D', ROOT / 'pgdata', '-U', 'guteli_demo',
             '--auth-local=trust', '--auth-host=scram-sha-256', '--pwfile', password_file,
             '--encoding=UTF8', '--locale=C'], env, stdout=subprocess.DEVNULL)
        password_file.unlink()
        with (ROOT / 'pgdata/postgresql.conf').open('a') as config:
            config.write(f"\nlisten_addresses = '127.0.0.1'\nport = {DB_PORT}\nunix_socket_directories = '{state['socket']}'\n")
        start_db(state)
        try:
            run([Path(pg_bin) / 'createdb', '-h', '127.0.0.1', '-p', DB_PORT, '-U', 'guteli_demo', 'guteli_test'], env)
            run([Path(pg_bin) / 'psql', '-h', '127.0.0.1', '-p', DB_PORT, '-U', 'guteli_demo', '-d', 'guteli_test',
                 '-c', "COMMENT ON DATABASE guteli_test IS 'guteli-demo-fixtures-v1'"], env)
            run([node, 'node_modules/drizzle-kit/bin.cjs', 'migrate', '--config=drizzle.config.ts'], env)
            run([node, '--import', 'tsx', 'scripts/seed.ts'], env)
            run([node, '--conditions=react-server', '--import', 'tsx', 'tests/support/seed-admin-owner.ts'], env)
            run([node, '--conditions=react-server', '--import', 'tsx', 'scripts/local-demo/seed-accounts.ts'], env)
            run([node, '--import', 'tsx', 'scripts/oracle/practice-orders.ts', '--apply'], env)
            shutil.copyfile(env['GUTELI_PRACTICE_MANIFEST'], ROOT / 'practice-manifest.json')
            (ROOT / 'initialized').write_text('guteli-owner-demo-v1\n')
        finally:
            pg(state, '-m', 'fast', '-w', 'stop')
        print('Demo preparada; datos preservados y PostgreSQL detenido.')
        return
    state = load()
    env = environment(state)
    if command == 'stop':
        stop_app()
        if db_running(state):
            pg(state, '-m', 'fast', '-w', 'stop')
        print('Demo detenida; base, fotos y cuentas conservadas.')
    elif command == 'start':
        if not (ROOT / 'initialized').exists():
            raise RuntimeError('Inicialización incompleta; no se reinicia ni borra automáticamente.')
        if (ROOT / 'app.pid').exists():
            raise RuntimeError('La demo ya tiene PID; usar status o stop primero.')
        if any(p.name != '.env.example' for p in REPO.glob('.env*')):
            raise RuntimeError('Se detectó un .env ajeno a la demo.')
        free_port(APP_PORT)
        start_db(state)
        with (ROOT / 'app.log').open('a') as log:
            child = subprocess.Popen([state['node'], str(REPO / 'node_modules/next/dist/bin/next'),
                                      'dev', '--hostname', '127.0.0.1', '--port', str(APP_PORT)],
                                     cwd=REPO, env=env, stdout=log, stderr=log, start_new_session=True)
        (ROOT / 'app.pid').write_text(str(child.pid))
        try:
            for _ in range(90):
                if child.poll() is not None:
                    raise RuntimeError('Next terminó; revisar app.log en el runtime indicado por status.')
                try:
                    with urllib.request.urlopen(URL + '/readyz', timeout=2) as response:
                        if response.status == 200:
                            print(f'Demo: {URL} | Administrador: {URL}/admin/login')
                            return
                except (OSError, TimeoutError):
                    time.sleep(1)
            raise RuntimeError('Readiness agotado; revisar app.log en el runtime indicado por status.')
        except BaseException:
            stop_app()
            pg(state, '-m', 'fast', '-w', 'stop')
            raise
    elif command == 'check':
        if not db_running(state):
            raise RuntimeError('Iniciar demo antes de verificar.')
        run([state['node'], 'node_modules/@playwright/test/cli.js', 'test',
             '--config=playwright.local-demo.config.ts', *sys.argv[2:]], env)
    elif command == 'credentials':
        print('SOLO DEMO LOCAL. Credenciales iniciales: caducan 24h después de init; cambiar contraseña y configurar MFA.')
        for role in ('owner', 'admin'):
            print(f"{role}-demo@example.test : {state[role + '_password']}")
    elif command == 'renew-setup':
        was_running = db_running(state)
        start_db(state)
        try:
            run([state['node'], '--conditions=react-server', '--import', 'tsx',
                 'scripts/local-demo/seed-accounts.ts', '--renew-setup'], env)
        finally:
            if not was_running:
                pg(state, '-m', 'fast', '-w', 'stop')
    elif command == 'status':
        print(f'PostgreSQL propio: {"activo" if db_running(state) else "detenido"}; URL: {URL}')
        print(f'Datos privados: {ROOT}; PID app: {(ROOT / "app.pid").read_text() if (ROOT / "app.pid").exists() else "ninguno"}')
    else:
        raise RuntimeError('Uso: demo.py init|start|stop|status|credentials|renew-setup|check')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Do not print connection strings or child command environments.
        print(f'Demo: {type(error).__name__}. Revisar configuración/logs locales; no se borraron datos.', file=sys.stderr)
        if isinstance(error, RuntimeError):
            print(str(error), file=sys.stderr)
        sys.exit(1)
