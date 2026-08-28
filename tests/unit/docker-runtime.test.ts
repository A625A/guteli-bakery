import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const composePath = path.join(repoRoot, 'compose.yaml');
const dockerConfigPath = path.join(
  repoRoot,
  '.superpowers',
  'sdd',
  '2026-08-27-guteli-backend-01-foundation',
  'docker-config',
);

function loadComposeConfig() {
  expect(existsSync(composePath)).toBe(true);

  const output = execFileSync(
    'docker',
    ['compose', '-f', composePath, 'config', '--format', 'json'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://guteli:guteli@database:5432/guteli',
        DOCKER_CONFIG: dockerConfigPath,
        HOSTNAME: '0.0.0.0',
        PORT: '3000',
        POSTGRES_DB: 'guteli',
        POSTGRES_PASSWORD: 'guteli',
        POSTGRES_USER: 'guteli',
        UPLOADS_ROOT: '/app/uploads',
      },
    },
  );

  return JSON.parse(output) as {
    services: Record<
      string,
      {
        healthcheck?: {
          test?: string[] | string;
        };
      }
    >;
    volumes: Record<string, object>;
  };
}

describe('compose runtime contract', () => {
  it('defines only the app and database services', () => {
    const compose = loadComposeConfig();
    const serviceNames = Object.keys(compose.services).sort();

    expect(serviceNames).toEqual(['app', 'database']);
    expect(serviceNames).not.toContain('queue');
    expect(serviceNames).not.toContain('redis');
    expect(serviceNames).not.toContain('worker');
  });

  it('configures health checks and named persistent volumes', () => {
    const compose = loadComposeConfig();

    expect(compose.services.app.healthcheck?.test).toBeTruthy();
    expect(compose.services.database.healthcheck?.test).toBeTruthy();
    expect(Object.keys(compose.volumes).sort()).toEqual([
      'db_data',
      'uploads_data',
    ]);
  });
});
