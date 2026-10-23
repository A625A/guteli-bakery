import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ops', Path(__file__).resolve().parents[2] / 'scripts/oracle/ops.py')
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)

class OperationSafety(unittest.TestCase):
    def test_missing_mount_fails_without_creating_path(self):
        with tempfile.TemporaryDirectory() as folder:
            missing = Path(folder).resolve() / 'missing'
            with self.assertRaisesRegex(RuntimeError, 'VOLUMEN_NO_MONTADO'):
                ops.mounted(missing, 'not-real', 'guteli-data-v1')
            self.assertFalse(missing.exists())

    def test_encrypted_round_trip_and_tamper_rejection(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            key = root / 'key'
            key.write_text('0123456789abcdef' * 4)
            source = root / 'synthetic'
            source.write_bytes(b'PRUEBA: synthetic data only' * 100)
            sealed = root / 'copy.enc'
            ops.seal(source, sealed, key)
            ops.unseal(sealed, root / 'result', key)
            self.assertEqual(source.read_bytes(), (root / 'result').read_bytes())
            with self.assertRaisesRegex(RuntimeError, 'RESPALDO_YA_EXISTE'):
                ops.seal(source, sealed, key)
            sealed.write_bytes(sealed.read_bytes() + b'corruption')
            with patch.object(ops, 'run') as command:
                with self.assertRaisesRegex(RuntimeError, 'BACKUP_INTEGRIDAD_INVALIDA'):
                    ops.unseal(sealed, root / 'bad', key)
                command.assert_not_called()

    def test_production_restore_target_rejected_before_commands(self):
        for url in ['postgresql://owner@remote/guteli', 'postgresql://owner@127.0.0.1:5432/guteli_restore_x', 'postgresql://owner@127.0.0.1:55439/guteli', 'postgresql://owner@127.0.0.1:55439/guteli_restore_x?host=remote']:
            with self.subTest(url=url), patch.object(ops, 'run') as command:
                with self.assertRaises(RuntimeError):
                    ops.restore(None, None, url, '/nonexistent-test-target')
                command.assert_not_called()

    def test_secret_file_permissions_and_duplicate_keys(self):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'config'
            file.write_text('KEY=a\nKEY=b\n')
            file.chmod(0o600)
            with self.assertRaisesRegex(RuntimeError, 'FORMATO_ENV_INVALIDO'):
                ops.read_env(file)
            file.chmod(0o644)
            with self.assertRaisesRegex(RuntimeError, 'PERMISOS_PRIVADOS'):
                ops.read_env(file)

    def test_schema_mismatch_blocks_update(self):
        with patch.object(ops, 'compose') as compose:
            compose.return_value.stdout = b'[]'
            with self.assertRaisesRegex(RuntimeError, 'ESQUEMA_DIFIERE'):
                ops.schema_check({})

    def test_weekly_backup_does_not_start_stopped_app(self):
        with patch.object(ops, 'compose_id', return_value='abc123'), patch.object(ops, 'capture', return_value='false'):
            with self.assertRaisesRegex(RuntimeError, 'APP_DETENIDA'):
                ops.require_running_app({})

    def test_install_refuses_existing_app(self):
        with patch.object(ops, 'compose') as command:
            command.return_value.stdout = b'abc123'
            with self.assertRaisesRegex(RuntimeError, 'INSTALACION_EXISTENTE'):
                ops.require_new_install({})

    def test_docker_cannot_follow_remote_context(self):
        with patch.dict(ops.os.environ, {'DOCKER_HOST': 'ssh://unrelated', 'DOCKER_CONTEXT': 'unrelated'}), patch.object(ops.subprocess, 'run') as command:
            command.return_value.returncode = 0
            ops.run(['docker', 'info'])
            args, kwargs = command.call_args
            self.assertEqual(args[0], ['docker', '--host', 'unix:///var/run/docker.sock', 'info'])
            self.assertNotIn('DOCKER_HOST', kwargs['env'])
            self.assertNotIn('DOCKER_CONTEXT', kwargs['env'])

if __name__ == '__main__': unittest.main()
