import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const testDatabaseScript = path.join(repoRoot, 'scripts', 'test-database.mjs');
const originalDatabaseUrlTest = process.env.DATABASE_URL_TEST;

afterEach(() => {
  vi.resetModules();

  if (originalDatabaseUrlTest === undefined) {
    delete process.env.DATABASE_URL_TEST;
  } else {
    process.env.DATABASE_URL_TEST = originalDatabaseUrlTest;
  }
});

describe('Playwright test database isolation', () => {
  it('refuses to configure E2E without DATABASE_URL_TEST', async () => {
    delete process.env.DATABASE_URL_TEST;
    vi.resetModules();

    await expect(import('../../playwright.config')).rejects.toThrow(
      'DATABASE_URL_TEST is required for E2E tests.',
    );
  });

  it('maps DATABASE_URL_TEST to the server-only DATABASE_URL', async () => {
    const databaseUrlTest =
      'postgresql://guteli:guteli@127.0.0.1:55433/guteli_test';
    process.env.DATABASE_URL_TEST = databaseUrlTest;
    vi.resetModules();

    const { default: config } = await import('../../playwright.config');
    const webServer = Array.isArray(config.webServer)
      ? config.webServer[0]
      : config.webServer;

    expect(webServer?.env?.DATABASE_URL).toBe(databaseUrlTest);
    expect(webServer?.reuseExistingServer).toBe(false);
  });

  it('rejects a DATABASE_URL_TEST that targets the development database', async () => {
    process.env.DATABASE_URL_TEST =
      'postgresql://guteli:guteli@127.0.0.1:5432/guteli';
    vi.resetModules();

    await expect(import('../../playwright.config')).rejects.toThrow(
      'DATABASE_URL_TEST must target the guteli_test database.',
    );
    await expect(import('../../vitest.integration.config')).rejects.toThrow(
      'DATABASE_URL_TEST must target the guteli_test database.',
    );
  });
});

describe('isolated Docker test database lifecycle', () => {
  it.each([
    [
      'up',
      [
        'guteli_test',
        '55433',
        'compose',
        '--project-name',
        'guteli-test',
        'up',
        '-d',
        '--wait',
        'database',
      ],
    ],
    [
      'down',
      [
        'guteli_test',
        '55433',
        'compose',
        '--project-name',
        'guteli-test',
        'down',
        '--volumes',
        '--remove-orphans',
      ],
    ],
  ])(
    'targets only the fixed guteli_test project for %s',
    (action, expected) => {
      const fakeBin = mkdtempSync(path.join(tmpdir(), 'guteli-docker-'));
      const fakeDocker = path.join(fakeBin, 'docker');

      writeFileSync(
        fakeDocker,
        [
          '#!/bin/sh',
          'printf \'%s\\n\' "$GUTELI_DATABASE_NAME" "$GUTELI_DATABASE_PORT" "$@"',
        ].join('\n'),
      );
      chmodSync(fakeDocker, 0o755);

      try {
        const output = execFileSync(
          process.execPath,
          [testDatabaseScript, action],
          {
            cwd: repoRoot,
            encoding: 'utf8',
            env: {
              ...process.env,
              PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
            },
          },
        );

        expect(output.trim().split('\n')).toEqual(expected);
      } finally {
        rmSync(fakeBin, { recursive: true, force: true });
      }
    },
  );

  it('uses the standalone Compose executable when the Docker plugin is unavailable', () => {
    const fakeBin = mkdtempSync(path.join(tmpdir(), 'guteli-compose-'));
    const fakeDocker = path.join(fakeBin, 'docker');
    const fakeDockerCompose = path.join(fakeBin, 'docker-compose');

    writeFileSync(fakeDocker, ['#!/bin/sh', 'exit 1'].join('\n'));
    writeFileSync(
      fakeDockerCompose,
      [
        '#!/bin/sh',
        'printf \'%s\\n\' "$GUTELI_DATABASE_NAME" "$GUTELI_DATABASE_PORT" "$@"',
      ].join('\n'),
    );
    chmodSync(fakeDocker, 0o755);
    chmodSync(fakeDockerCompose, 0o755);

    try {
      const output = execFileSync(
        process.execPath,
        [testDatabaseScript, 'up'],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${fakeBin}${path.delimiter}${process.env.PATH ?? ''}`,
          },
        },
      );

      expect(output.trim().split('\n')).toEqual([
        'guteli_test',
        '55433',
        '--project-name',
        'guteli-test',
        'up',
        '-d',
        '--wait',
        'database',
      ]);
    } finally {
      rmSync(fakeBin, { recursive: true, force: true });
    }
  });
});
