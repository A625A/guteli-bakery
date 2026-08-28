import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const composePath = path.join(repoRoot, 'compose.yaml');
const dockerignorePath = path.join(repoRoot, '.dockerignore');
const readmePath = path.join(repoRoot, 'README.md');
const dockerfilePath = path.join(repoRoot, 'Dockerfile');
const entrypointPath = path.join(repoRoot, 'scripts', 'docker-entrypoint.sh');

type ComposeService = {
  environment?: Record<string, string>;
  healthcheck?: {
    test?: string[] | string;
  };
  image?: string;
  ports?: string[];
  volumes?: string[];
};

function loadComposeConfig() {
  expect(existsSync(composePath)).toBe(true);

  return parse(readFileSync(composePath, 'utf8')) as {
    services: Record<string, ComposeService>;
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

  it('pins the runtime invariants and keeps migrations explicit', () => {
    const compose = loadComposeConfig();
    const dockerfile = readFileSync(dockerfilePath, 'utf8');
    const entrypoint = readFileSync(entrypointPath, 'utf8');
    const composeSource = readFileSync(composePath, 'utf8');

    expect(compose.services.database.image).toBe('postgres:17');
    expect(compose.services.database.environment?.POSTGRES_DB).toBe(
      '${GUTELI_DATABASE_NAME:-guteli}',
    );
    expect(compose.services.database.ports).toEqual([
      '127.0.0.1:${GUTELI_DATABASE_PORT:-5432}:5432',
    ]);
    expect(compose.services.database.volumes).toEqual([
      'db_data:/var/lib/postgresql/data',
    ]);
    expect(compose.services.app.environment?.DATABASE_URL).toBe(
      'postgresql://guteli:guteli@database:5432/${GUTELI_DATABASE_NAME:-guteli}',
    );
    expect(compose.services.app.volumes).toEqual(['uploads_data:/app/uploads']);
    expect(dockerfile).toMatch(/^USER nextjs$/m);
    expect(dockerfile).toMatch(
      /^ENTRYPOINT \["\/app\/scripts\/docker-entrypoint\.sh"\]$/m,
    );
    expect(entrypoint).toContain('exec "$@"');
    expect(`${composeSource}\n${dockerfile}\n${entrypoint}`).not.toMatch(
      /(?:db:migrate|drizzle-kit migrate|npm run seed|seed data)/i,
    );
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
    expect(readme).toMatch(/^docker compose config$/m);
    expect(readme).toContain('does not require Docker');
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
      'DATABASE_URL="${MIGRATION_DATABASE_URL:?set a database-host migration URL before running migrations}"',
    );
    expect(readme).toContain('@database:5432/<database>');
    expect(readme).toContain('never `localhost`');
    expect(readme).not.toContain(
      '-e DATABASE_URL=postgresql://guteli:guteli@database:5432/guteli',
    );
  });
});
