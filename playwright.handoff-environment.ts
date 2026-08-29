import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function createHandoffEnvironment(label: string) {
  const uploadsRoot = mkdtempSync(
    join(tmpdir(), `guteli-playwright-${label}-`),
  );
  const uploadsStateFile = join(
    tmpdir(),
    `guteli-playwright-roots-${label}-${process.pid}.txt`,
  );

  appendFileSync(uploadsStateFile, `${uploadsRoot}\n`, { mode: 0o600 });

  return { uploadsRoot, uploadsStateFile };
}
