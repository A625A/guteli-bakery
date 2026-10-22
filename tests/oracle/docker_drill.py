"""Ticket 02 local Linux rehearsal. Run only in a disposable, explicitly approved VM.

Requires existing Docker/Compose, git, Python, openssl, ext4 and root for isolated
loop mounts. Installs nothing. Never uses OCI, network Git, or existing databases.
All fixture secrets and raw output stay beneath a fresh /tmp/guteli-ticket02-*.
"""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT = Path('/tmp/guteli-ticket02-xdp8p2kh')
SOURCE = '/Users/andrewarana/.codex/worktrees/guteli-oracle-always-free/Guteli Bakery'
SHA = '9477d74c8081d3163b1f789e1bf8b5e1c13e67ee'
NODE = 'node:22-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d'
POSTGRES = 'postgres:17-bookworm@sha256:858bb5e98eed02eb8cafbcdc007f9a65d1b613972028944a8ec2133ccaf80d27'
CADDY = 'caddy:2@sha256:3095ad245c353e3bdb27a38f22a095c1cfa9e295ab21c0214c3e72b0e2960525'
BUILDER = 'guteli-ticket02-builder:9477d74'
APP = 'guteli-ticket02-app:9477d74'
os.umask(0o077)
# Never inherit a remote Docker context, even in diagnostic subprocesses.
for key in list(os.environ):
    if key.startswith('DOCKER_'): del os.environ[key]
os.environ['DOCKER_HOST'] = 'unix:///var/run/docker.sock'

def run(args, **kwargs):
    result = subprocess.run([str(a) for a in args], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, **kwargs)
    with (ROOT / 'private.log').open('ab') as log:
        log.write(result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError('Command failed: ' + str(args[:3]) + '; see private.log')
    return result.stdout.decode().strip()

def record(name, detail='PASS'):
    print(name + ': ' + detail, flush=True)
    with (ROOT / 'results.jsonl').open('a') as f:
        f.write(json.dumps({'check': name, 'result': detail}) + '\n')

def docker(*args, **kwargs):
    return run(['docker', '--host', 'unix:///var/run/docker.sock', *args], **kwargs)

def compose(*args, **kwargs):
    return docker('compose', '-p', 'guteli-ticket02', '--env-file', '/dev/null',
                  '-f', ROOT / 'compose.json', *args, **kwargs)

def sql(query, database='guteli'):
    return compose('exec', '-T', 'database', 'psql', '-XAt', '-v', 'ON_ERROR_STOP=1',
                   '-U', 'guteli', '-d', database, input=query.encode())

def setup():
    assert not ROOT.exists(), 'Fresh root required; never overwrite an earlier run'
    assert os.geteuid() == 0
    ROOT.mkdir(mode=0o700)
    assert docker('info', '--format', '{{.Architecture}}') in ('aarch64', 'arm64')
    assert not docker('ps', '-aq', '--filter', 'label=com.docker.compose.project=guteli-ticket02')
    os.umask(0o022)
    run(['git', 'clone', '--no-hardlinks', '--single-branch', '--branch',
         'infra/oracle-always-free-preparation', SOURCE, ROOT / 'release'])
    run(['git', '-C', ROOT / 'release', 'checkout', '--detach', SHA])
    os.umask(0o077)
    assert run(['git', '-C', ROOT / 'release', 'rev-parse', 'HEAD']) == SHA
    for name, marker in [('data', 'guteli-data-v1'), ('backups', 'guteli-backups-v1')]:
        image, target = ROOT / (name + '.ext4'), ROOT / name
        target.mkdir()
        run(['truncate', '-s', '7G', image])
        run(['mkfs.ext4', '-q', '-F', image])
        run(['mount', '-o', 'loop', image, target])
        (target / '.guteli-volume').write_text(marker)
    for name, uid in [('uploads', 1001), ('postgres', 999), ('caddy', 1001)]:
        p = ROOT / 'data' / name
        p.mkdir(mode=0o700)
        os.chown(p, uid, uid)
    (ROOT / 'data').chmod(0o755)
    (ROOT / 'data/.guteli-volume').chmod(0o644)
    marker = ROOT / 'data/uploads/.guteli-volume'
    marker.write_text('guteli-uploads-v1')
    os.chown(marker, 1001, 1001)
    password, auth, rate, receipt, backup = [os.urandom(32).hex() for _ in range(5)]
    (ROOT / 'postgres-password').write_text(password)
    os.chown(ROOT / 'postgres-password', 999, 999)
    (ROOT / 'backup-key').write_text(backup)
    runtime = dict(DATABASE_URL=f'postgresql://guteli:{password}@database:5432/guteli',
                   BETTER_AUTH_URL='https://guteli.invalid', BETTER_AUTH_SECRET=auth,
                   RATE_LIMIT_SECRET=rate, RECEIPT_TOKEN_SECRET=receipt,
                   NODE_ENV='production', UPLOADS_ROOT='/app/uploads', TRUSTED_PROXY_HOPS='1',
                   COMMERCIAL_ORDERS_ENABLED='false', PAYMENTS_ENABLED='false',
                   WHATSAPP_NOTIFICATIONS_ENABLED='false', WHATSAPP_WEBHOOKS_ENABLED='false')
    (ROOT / 'runtime.env').write_text(''.join(f'{k}={v}\n' for k,v in runtime.items()))
    app = docker('image', 'inspect', APP, '--format', '{{.Id}}')
    env = dict(GUTELI_APP_IMAGE=app, GUTELI_POSTGRES_IMAGE=POSTGRES,
               GUTELI_CADDY_IMAGE=CADDY, GUTELI_NODE_IMAGE=NODE,
               GUTELI_RUNTIME_ENV=str(ROOT / 'runtime.env'),
               GUTELI_POSTGRES_PASSWORD_FILE=str(ROOT / 'postgres-password'),
               GUTELI_BACKUP_KEY_FILE=str(ROOT / 'backup-key'),
               GUTELI_DATA_ROOT=str(ROOT / 'data'), GUTELI_BACKUP_ROOT=str(ROOT / 'backups'),
               GUTELI_HOSTNAME='guteli.invalid', ACME_EMAIL='operator@example.invalid')
    for name in ('DATA','BACKUP'):
        env['GUTELI_'+name+'_UUID'] = run(['findmnt','-rn','-M',env['GUTELI_'+name+'_ROOT'],'-o','UUID'])
    (ROOT / 'compose.env').write_text(''.join(f'{k}={v}\n' for k,v in env.items()))
    original = ROOT / 'release/infra/oracle/compose.yaml'
    config = json.loads(docker('compose', '--env-file', ROOT / 'compose.env', '-f', original,
                               'config', '--format', 'json'))
    assert 'ports' not in config['services']['app']
    assert 'ports' not in config['services']['database']
    assert config['networks']['backend']['internal'] is True
    assert all(config['services']['app']['environment'][k] == 'false' for k in
               ('COMMERCIAL_ORDERS_ENABLED','PAYMENTS_ENABLED','WHATSAPP_NOTIFICATIONS_ENABLED','WHATSAPP_WEBHOOKS_ENABLED'))
    record('production-compose-config-and-demo-switches')
    caddy = (ROOT / 'release/infra/oracle/Caddyfile').read_text()
    local = re.sub(r'    tls \{\n        issuer acme \{.*?\n    \}', '    tls internal', caddy, flags=re.S)
    assert local != caddy
    local = local.replace('    admin off\n', '    admin off\n    servers {\n        protocols h1 h2\n    }\n')
    (ROOT / 'Caddyfile').write_text(local)
    (ROOT / 'Caddyfile').chmod(0o644)
    config['services']['proxy']['cap_add'] = ['NET_BIND_SERVICE']
    config['name'] = 'guteli-ticket02'
    for key, network in config['networks'].items():
        network['name'] = 'guteli-ticket02_' + key
    config['services']['proxy']['ports'] = [dict(target=8080,published='18080',host_ip='127.0.0.1',protocol='tcp'),
                                            dict(target=8443,published='18443',host_ip='127.0.0.1',protocol='tcp')]
    for v in config['services']['proxy']['volumes']:
        if v['target'] == '/etc/caddy/Caddyfile': v['source'] = str(ROOT / 'Caddyfile')
    (ROOT / 'compose.json').write_text(json.dumps(config))
    record('local-override', 'project guteli-ticket02; loopback 18080/18443; internal TLS; private raw config')
    init = dict(POSTGRES_USER='guteli',POSTGRES_DB='guteli',PGDATA='/data/postgres',
                POSTGRES_PASSWORD_FILE='/run/secrets/postgres_password')
    (ROOT / 'init.env').write_text(''.join(f'{k}={v}\n' for k,v in init.items()))
    docker('run','--name','guteli-ticket02-init','-d','--network','none','--user','999:999',
           '--env-file',ROOT/'init.env','--mount',f'type=bind,src={ROOT}/data,dst=/data',
           '--mount',f'type=bind,src={ROOT}/postgres-password,dst=/run/secrets/postgres_password,readonly',POSTGRES)
    for _ in range(40):
        result = subprocess.run(['docker','exec','guteli-ticket02-init','pg_isready','-h','127.0.0.1','-U','guteli','-d','guteli'],
                                stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        if result.returncode == 0: break
        time.sleep(1)
    else: raise RuntimeError('init timeout')
    docker('stop','guteli-ticket02-init')
    fixtures()

def fixtures():
    compose('up','-d','--wait','--wait-timeout','60','database')
    docker('run','--rm','--network','guteli-ticket02_backend','--env-file',ROOT/'runtime.env',BUILDER,
           'npm','run','db:migrate')
    sql("INSERT INTO categories(name,slug) VALUES ('PRUEBA','prueba'); "
        "INSERT INTO products(category_id,name,slug,price_minor,sale_unit) SELECT id,'PRUEBA PAN '||n,'prueba-'||n,100,'unidad' FROM categories CROSS JOIN generate_series(1,2) n; "
        "COMMENT ON DATABASE guteli IS 'guteli-demo-fixtures-v1';")
    docker('run','--rm','--network','guteli-ticket02_backend','--env-file',ROOT/'runtime.env',
           '-e','GUTELI_PRACTICE_AUTHORIZATION=guteli-practica-v1','-e','GUTELI_PRACTICE_MANIFEST=/fixture/practice.json',
           '--mount',f'type=bind,src={ROOT},dst=/fixture',BUILDER,
           'node','--import','tsx','scripts/oracle/practice-orders.ts','--apply')
    sql("INSERT INTO outbox_events(event_type,payload) VALUES ('TICKET02_SYNTHETIC','{}');")
    key = 'ticket02-synthetic.png'
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=')
    image = ROOT/'data/uploads'/hashlib.sha256(key.encode()).hexdigest()
    image.write_bytes(png); os.chown(image,1001,1001)
    sql("INSERT INTO product_images(product_id,storage_key,mime_type,width,height) SELECT id,'ticket02-synthetic.png','image/png',1,1 FROM products ORDER BY id LIMIT 1;")
    record('postgres-provision-migrations-and-fictional-fixtures')

def load_ops():
    spec = importlib.util.spec_from_file_location('ops',ROOT/'release/scripts/oracle/ops.py')
    ops = importlib.util.module_from_spec(spec); spec.loader.exec_module(ops)
    # Production functions unchanged; only isolated Compose file/project adapter.
    def adapter(env,*args,**kwargs):
        return ops.run(['docker','compose','-p','guteli-ticket02','--env-file','/dev/null',
                        '-f',str(ROOT/'compose.json'),*args], **kwargs)
    ops.compose = adapter
    return ops, ops.configuration(ROOT/'compose.env')

def smoke():
    ops, env = load_ops()
    ops.preflight(env); record('real-mount-uuid-permissions-space-preflight')
    sys.argv = ['ops.py','install','--env',str(ROOT/'compose.env'),'--sha',SHA,'--apply','--ack','AUTORIZADO_LOCAL']
    ops.main()
    ops.health(env); record('next-postgres-readiness')
    docker('run','--rm','--network','none','--env-file',ROOT/'runtime.env',BUILDER,'npm','run','production:check')
    record('production-runtime-configuration')
    record('native-runtime',compose('exec','-T','app','node','-e',
        "require('sharp')({create:{width:1,height:1,channels:3,background:'red'}}).png().toBuffer().then(b=>console.log(process.platform+'/'+process.arch+' '+process.version+' sharp='+b.length))"))
    js = """(async()=>{for(const p of ['/api/orders','/api/checkout-session','/api/checkout-summary','/api/checkout-review']){let r=await fetch('http://127.0.0.1:3000'+p,{method:'POST',body:'not-json'});if(r.status!==403||(await r.json()).error.code!=='COMMERCIAL_DEMO')throw Error(p)}console.log('4 routes rejected before parsing')})().catch(()=>process.exit(1))"""
    record('demo-endpoints',compose('exec','-T','app','node','-e',js))
    assert sql('SELECT count(*) FROM orders') == '5'
    assert sql("SELECT count(*) FROM outbox_events WHERE state='PENDING' AND attempts=0") == '1'
    before = sql("SELECT md5(json_agg(t ORDER BY id)::text) FROM products t")
    images = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'data/uploads').iterdir()}
    compose('restart','database','app'); compose('up','-d','--wait','--wait-timeout','120')
    assert before == sql("SELECT md5(json_agg(t ORDER BY id)::text) FROM products t")
    assert images == {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'data/uploads').iterdir()}
    ops.health(env); record('restart-database-catalog-images')

def rejected(name, fn, code):
    try:
        fn()
    except RuntimeError as error:
        assert code in str(error), str(error)
        record(name, 'REJECTED: '+code)
    else:
        raise AssertionError(name+' unexpectedly accepted')

def action(ops, name):
    result=subprocess.run([sys.executable,__file__,'cli',name],capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stderr.strip())
    print(result.stdout, end='', flush=True)

def cli():
    name=sys.argv[2]
    ops, env=load_ops()
    sys.argv = ['ops.py',name,'--env',str(ROOT/'compose.env'),'--sha',SHA,
                '--apply','--ack','AUTORIZADO_LOCAL']
    ops.main()

def faults():
    ops, env = load_ops()
    rejected('missing-mount',lambda:ops.mounted(ROOT/'absent','invalid','invalid'),'VOLUMEN_NO_MONTADO')
    assert not (ROOT/'absent').exists()
    rejected('wrong-uuid',lambda:ops.mounted(ROOT/'data','invalid','guteli-data-v1'),'UUID_DE_VOLUMEN_INCORRECTO')
    for name, args, expected in [
        ('app-without-upload-mount',['--env','UPLOADS_ROOT=/app/uploads',APP],'GUTELI_STORAGE_UNAVAILABLE'),
        ('database-without-data-mount',['--entrypoint','sh','--mount',f'type=bind,src={ROOT}/release/infra/oracle/database-entrypoint.sh,dst=/guard,readonly',POSTGRES,'/guard','postgres'],'GUTELI_DATABASE_VOLUME_UNAVAILABLE')]:
        p=subprocess.run(['docker','run','--rm','--network','none',*args],capture_output=True,text=True)
        assert p.returncode != 0 and expected in p.stderr
        record(name,'REJECTED: '+expected)
    blank=ROOT/'blank-data'; blank.mkdir(mode=0o755,exist_ok=True); (blank/'postgres').mkdir(exist_ok=True)
    (blank/'.guteli-volume').write_text('guteli-data-v1')
    p=subprocess.run(['docker','run','--rm','--network','none','--entrypoint','sh',
        '--mount',f'type=bind,src={blank},dst=/data',
        '--mount',f'type=bind,src={ROOT}/release/infra/oracle/database-entrypoint.sh,dst=/guard,readonly',
        POSTGRES,'/guard','postgres'],capture_output=True,text=True)
    assert p.returncode != 0 and 'GUTELI_DATABASE_VOLUME_UNAVAILABLE' in p.stderr
    assert not (blank/'postgres/PG_VERSION').exists(); record('missing-PG_VERSION','REJECTED')
    rejected('install-over-existing-app',lambda:action(ops,'install'),'INSTALACION_EXISTENTE')
    faults_schema()

def faults_schema():
    ops, env=load_ops()
    # Wrong schema is reversible and restricted to this synthetic database.
    original=sql('SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1')
    sql("UPDATE drizzle.__drizzle_migrations SET hash='ticket02-invalid' WHERE created_at=(SELECT max(created_at) FROM drizzle.__drizzle_migrations)")
    try:
        rejected('update-incompatible-schema',lambda:action(ops,'update'),'ESQUEMA_DIFIERE')
    finally:
        sql("UPDATE drizzle.__drizzle_migrations SET hash='"+original+"' WHERE hash='ticket02-invalid'")
    marker=ROOT/'data/uploads/.guteli-volume'; marker.rename(marker.with_suffix('.saved'))
    try:
        value=compose('exec','-T','app','node','-e',"fetch('http://127.0.0.1:3000/readyz').then(async r=>console.log(r.status+' '+await r.text()))")
        assert value == '503 {"status":"unavailable"}'; record('readiness-lost-storage','503 generic response')
    finally:
        marker.with_suffix('.saved').rename(marker)
    ops.health(env)
    # Real bind failure must not create the missing host path.
    c=json.loads((ROOT/'compose.json').read_text())
    c['services']['app']['volumes'][0]['source']=str(ROOT/'missing-uploads')
    (ROOT/'missing-compose.json').write_text(json.dumps(c))
    p=subprocess.run(['docker','compose','-p','guteli-ticket02-negative','-f',str(ROOT/'missing-compose.json'),
                      'run','--rm','--no-deps','app'],capture_output=True,text=True)
    assert p.returncode != 0 and 'bind source path does not exist' in p.stderr
    assert not (ROOT/'missing-uploads').exists(); record('missing-bind-source','REJECTED without creating path')

def operations():
    ops, env = load_ops()
    assert sql("SELECT count(*) FROM outbox_events WHERE state='PENDING' AND attempts=0")=='1'
    started=time.monotonic(); action(ops,'update')
    record('update-with-encrypted-backup',str(round(time.monotonic()-started,2))+' seconds; same immutable candidate reapplied')
    operations_rest()

def operations_rest():
    ops, env=load_ops()
    snapshots={name:sql('SELECT md5(coalesce(json_agg(t ORDER BY id)::text,\'\')) FROM '+name+' t')
               for name in ['products','categories','product_images','orders','order_items','outbox_events']}
    (ROOT/'snapshots.json').write_text(json.dumps(snapshots))
    archives=list((ROOT/'backups').glob('*.enc')); assert len(archives)==1
    archive=archives[0]
    fake=[]
    for n in range(3):
        p=ROOT/'backups'/('fixture-full-'+str(n)+'.enc'); p.write_bytes(b'fixture'); fake.append(p)
    try:
        rejected('update-backup-failure',lambda:action(ops,'update'),'RETENCION_LLENA')
        ops.health(env); record('backup-failure-keeps-previous-app-healthy')
    finally:
        for p in fake: p.unlink()
    compose('stop','app')
    rejected('weekly-backup-stopped-app',lambda:action(ops,'weekly-backup'),'APP_DETENIDA')
    assert docker('inspect','--format','{{.State.Running}}',ops.compose_id(env,'app'))=='false'
    record('weekly-backup-preserves-stopped-state')
    # New Docker restore destination, reachable only at VM loopback:55442.
    target=ROOT/'restore-postgres'; target.mkdir(mode=0o700); os.chown(target,999,999)
    docker('network','create','guteli-ticket02_restore-loopback')
    docker('run','--name','guteli-ticket02-restore','-d','--network','guteli-ticket02_restore-loopback',
           '-p','127.0.0.1:55442:5432','--user','999:999','--env-file',ROOT/'init.env',
           '--mount',f'type=bind,src={target},dst=/data/postgres',
           '--mount',f'type=bind,src={ROOT}/postgres-password,dst=/run/secrets/postgres_password,readonly',POSTGRES)
    for _ in range(40):
        r=subprocess.run(['docker','exec','guteli-ticket02-restore','pg_isready','-h','127.0.0.1','-U','guteli'],capture_output=True)
        if r.returncode==0: break
        time.sleep(1)
    else: raise RuntimeError('restore DB timeout')
    restoration()

def restoration():
    ops, env=load_ops()
    snapshots=json.loads((ROOT/'snapshots.json').read_text())
    archive=next((ROOT/'backups').glob('*.enc'))
    # Existing image supplies clients; no host packages installed. The target
    # remains the exact loopback URL accepted by ops.restore (no port rewrite).
    original_run=ops.run
    def clients(args, **kwargs):
        if args[0] in ('createdb','pg_restore'):
            prefix=['docker','run','--rm','--network','host']
            for key in ('PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE'):
                prefix+=['--env',key]
            if args[0]=='pg_restore':
                p=Path(args[-1]).parent
                prefix+=['--mount',f'type=bind,src={p},dst={p},readonly']
            args=[*prefix,POSTGRES,*args]
        return original_run(args,**kwargs)
    ops.run=clients
    password=(ROOT/'postgres-password').read_text()
    url='postgresql://guteli:'+password+'@127.0.0.1:55442/guteli_restore_ticket02'
    started=time.monotonic()
    ops.restore(archive,ROOT/'backup-key',url,ROOT/'restored-uploads')
    for name, expected in snapshots.items():
        actual=docker('exec','guteli-ticket02-restore','psql','-XAt','-U','guteli','-d','guteli_restore_ticket02','-c',
                      'SELECT md5(coalesce(json_agg(t ORDER BY id)::text,\'\')) FROM '+name+' t')
        assert actual==expected,name
    for p in (ROOT/'data/uploads').iterdir():
        assert p.read_bytes()==(ROOT/'restored-uploads'/p.name).read_bytes()
    record('docker-encrypted-restore-data-images-pending-work',str(round(time.monotonic()-started,2))+' seconds; six table digests and image bytes equal')
    rejected('restore-existing-database',lambda:ops.restore(archive,ROOT/'backup-key',url,ROOT/'duplicate-uploads'),'OPERACION_FALLIDA')
    assert not (ROOT/'duplicate-uploads').exists()
    corrupted=ROOT/'corrupted.enc'; corrupted.write_bytes(archive.read_bytes()+b'corrupt')
    corrupted.with_suffix('.hmac').write_bytes(archive.with_suffix('.hmac').read_bytes())
    rejected('backup-tamper',lambda:ops.unseal(corrupted,ROOT/'bad.tar',ROOT/'backup-key'),'BACKUP_INTEGRIDAD_INVALIDA')
    compose('start','--wait','--wait-timeout','120','app'); ops.health(env)
    record('manual-recovery-without-implicit-migration')

def recovery_app():
    env={line.split('=',1)[0]:line.split('=',1)[1] for line in (ROOT/'runtime.env').read_text().splitlines()}
    env['DATABASE_URL']=env['DATABASE_URL'].replace('@database:5432/guteli','@guteli-ticket02-restore:5432/guteli_restore_ticket02')
    env['REQUIRE_PERSISTENT_STORAGE']='true'
    (ROOT/'recovery.env').write_text(''.join(f'{k}={v}\n' for k,v in env.items()))
    uploads=ROOT/'restored-uploads'
    for p in [uploads,*uploads.rglob('*')]: os.chown(p,1001,1001)
    docker('run','--name','guteli-ticket02-recovered-app','-d','--network','guteli-ticket02_restore-loopback',
           '--user','1001:1001','--cap-drop','ALL','--security-opt','no-new-privileges:true',
           '--read-only','--tmpfs','/tmp:mode=1777,size=64m','--tmpfs','/app/.next/cache:uid=1001,gid=1001,size=128m',
           '--env-file',ROOT/'recovery.env','--mount',f'type=bind,src={uploads},dst=/app/uploads',APP)
    js="fetch('http://127.0.0.1:3000/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
    for _ in range(30):
        p=subprocess.run(['docker','exec','guteli-ticket02-recovered-app','node','-e',js],capture_output=True)
        if p.returncode==0: break
        time.sleep(1)
    else: raise RuntimeError('recovered app not ready')
    assert docker('exec','guteli-ticket02-restore','psql','-XAt','-U','guteli','-d','guteli_restore_ticket02','-c',
                  "SELECT count(*) FROM outbox_events WHERE state='PENDING' AND attempts=0")=='1'
    record('recovered-app-readiness', '200 using restored database and restored uploads; pending work untouched')

if __name__ == '__main__':
    stages = {name: globals()[name] for name in ('setup','fixtures','smoke','faults','faults_schema','operations','operations_rest','restoration','recovery_app','cli')}
    assert len(sys.argv)>1 and sys.argv[1] in stages, 'Choose a documented rehearsal stage'
    try:
        stages[sys.argv[1]]()
    except RuntimeError as error:
        print(str(error),file=sys.stderr)
        sys.exit(1)
