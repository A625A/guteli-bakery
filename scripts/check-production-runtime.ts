import { loadEnvConfig } from '@next/env';
import { validateProductionRuntime } from '../src/server/config/production-runtime';

loadEnvConfig(process.cwd(), false);
try {
  validateProductionRuntime(process.env);
  console.log(
    'Web store configuration preflight passed. Hosting, schema, storage, TLS and ingress still require verification. Payments remain disabled.',
  );
} catch {
  console.error(
    'Invalid production runtime configuration. See docs/operations/production-web-store.md. No configuration values were logged.',
  );
  process.exitCode = 1;
}
