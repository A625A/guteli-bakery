import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const composePath = path.join(repoRoot, 'compose.yaml');
const dockerignorePath = path.join(repoRoot, '.dockerignore');
const readmePath = path.join(repoRoot, 'README.md');

function resolveComposeInvocation() {
  try {
    execFileSync('docker', ['compose', 'version'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    return { command: 'docker', args: ['compose'] };
  } catch {}

  try {
    execFileSync('docker-compose', ['version'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    return { command: 'docker-compose', args: [] as string[] };
  } catch {}

  throw new Error('Docker Compose CLI is required for docker runtime tests.');
}

function loadComposeConfig() {
  expect(existsSync(composePath)).toBe(true);
  const composeCli = resolveComposeInvocation();

  const output = execFileSync(
    composeCli.command,
    [...composeCli.args, '-f', composePath, 'config', '--format', 'json'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
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

function readDockerignorePatterns() {
  return readFileSync(dockerignorePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function readReadme() {
  return readFileSync(readmePath, 'utf8');
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

  it('keeps local env files out of the Docker build context', () => {
    const patterns = readDockerignorePatterns();

    expect(patterns).toContain('.env');
    expect(patterns).toContain('.env.*');
    expect(patterns).toContain('!.env.example');
  });

  it('documents ordinary docker compose commands without repo-local overrides', () => {
    const readme = readReadme();

    expect(readme).toMatch(/^docker compose up --build -d$/m);
    expect(readme).toMatch(/^docker compose down$/m);
    expect(readme).not.toMatch(/DOCKER_CONFIG=.*\.superpowers/);
    expect(readme).not.toMatch(/DOCKER_HOST=.*(?:\.colima|docker\.sock)/);
    expect(readme).toContain('colima status');
  });

  it('documents explicit migration prerequisites and production secret injection', () => {
    const readme = readReadme();

    expect(readme).toContain('docker compose up -d database');
    expect(readme).toContain('docker compose ps');
    expect(readme).toContain(
      'docker compose exec -T database pg_isready -U guteli -d guteli',
    );
    expect(readme).toContain('docker build --target builder');
    expect(readme).toContain(
      'docker inspect "$(docker compose ps -q database)"',
    );
    expect(readme).toContain('DATABASE_URL from its secret environment');
    expect(readme).toContain(
      'DATABASE_URL="${DATABASE_URL:?set DATABASE_URL before running migrations}"',
    );
    expect(readme).not.toContain(
      '-e DATABASE_URL=postgresql://guteli:guteli@database:5432/guteli',
    );
  });
});
