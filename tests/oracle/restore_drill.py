"""Native PostgreSQL counterpart to the Docker backup drill; synthetic DB only."""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tarfile
import time

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('ops', root / 'scripts/oracle/ops.py')
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)
work = Path((root / 'artifacts/oracle-preparation/local-validation-root.txt').read_text()) / ('restore-drill-' + str(int(time.time())))
work.mkdir(mode=0o700)
os.umask(0o077)
source = 'guteli_practice_validation'
env = {k: v for k,v in os.environ.items() if not k.startswith('PG')}
env.update(PGHOST='127.0.0.1', PGPORT='55439', PGUSER='guteli_test_operator')
def query(database, sql):
    return subprocess.check_output(['psql', '-XAt', '-d', database, '-c', sql], env=env, text=True).strip()
assert query(source, 'SELECT current_database()') == source
assert query(source, 'SELECT count(*) FROM orders') == '5'
assert query(source, "SELECT count(*) FROM orders WHERE public_id LIKE 'PRUEBA-%' AND phone='PRUEBA-SIN-TELEFONO' AND payment_status='UNPAID'") == '5'
uploads = work.parent / 'practice-uploads'
assert uploads.is_dir()
(uploads / 'fixture.png').write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII='))
(uploads / '.guteli-volume').write_text('guteli-uploads-v1')
with (work / 'database.dump').open('wb') as dump:
    subprocess.run(['pg_dump', '-d', source, '-Fc', '--no-owner', '--no-acl'], env=env, stdout=dump, check=True)
manifest = {'format': 1, 'migrations': ops.migration_manifest(), 'database_sha256': ops.digest(work / 'database.dump'), 'files': {'uploads/' + str(p.relative_to(uploads)): ops.digest(p) for p in uploads.rglob('*') if p.is_file()}}
(work / 'manifest.json').write_text(json.dumps(manifest))
with tarfile.open(work / 'backup.tar', 'w') as tar:
    for name in ['database.dump', 'manifest.json']: tar.add(work / name, arcname=name)
    tar.add(uploads, arcname='uploads')
key = work / 'key'
key.write_text(os.urandom(32).hex())
archive = work / 'backup.enc'
ops.seal(work / 'backup.tar', archive, key)
started = time.monotonic()
target = 'guteli_restore_drill_' + str(int(time.time()))
ops.restore(archive, key, 'postgresql://guteli_test_operator@127.0.0.1:55439/' + target, work / 'restored-uploads')
queries = {
    'orders': 'SELECT count(*) FROM orders',
    'items': 'SELECT count(*) FROM order_items',
    'catalog': 'SELECT count(*) FROM products',
    'accounts': 'SELECT count(*) FROM "user"',
    'image_references': 'SELECT count(*) FROM product_images',
    'mfa_records': 'SELECT md5(coalesce(json_agg(t ORDER BY id)::text, \'\')) FROM two_factor t',
    'order_data': 'SELECT md5(coalesce(json_agg(t ORDER BY id)::text, \'\')) FROM orders t',
    'pending_data': 'SELECT md5(coalesce(json_agg(t ORDER BY id)::text, \'\')) FROM outbox_events t',
    'roles': 'SELECT string_agg(role::text, \',\' ORDER BY id) FROM "user"',
    'pending': 'SELECT count(*) FROM outbox_events',
    'schema': 'SELECT string_agg(hash, \',\' ORDER BY created_at) FROM drizzle.__drizzle_migrations',
    'states': 'SELECT string_agg(order_status::text, \',\' ORDER BY public_id) FROM orders',
}
checks = {}
for name, sql in queries.items():
    before, after = query(source, sql), query(target, sql)
    assert before == after, name
    checks[name] = 'equal'
for file in uploads.rglob('*'):
    if file.is_file(): assert ops.digest(file) == ops.digest(work / 'restored-uploads' / file.relative_to(uploads))
for storage_key in json.loads(query(target, 'SELECT json_agg(storage_key) FROM product_images')):
    assert (work / 'restored-uploads' / hashlib.sha256(storage_key.encode()).hexdigest()).is_file()
try:
    ops.restore(archive, key, 'postgresql://guteli_test_operator@127.0.0.1:55439/' + target, work / 'second-uploads')
    raise AssertionError('existing DB accepted')
except RuntimeError:
    assert not (work / 'second-uploads').exists()
print(json.dumps({'result': 'PASS', 'scope': 'native PostgreSQL 17, not Docker or Oracle', 'seconds': round(time.monotonic() - started, 2), 'checks': checks, 'images': 'byte-identical', 'existing_database_restore': 'rejected', 'archive_sha256': ops.digest(archive)}, indent=2))
