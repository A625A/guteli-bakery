import { lstat, readFile, rm, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

export default async function globalTeardown(config) {
  const uploadsStateFile = config.metadata?.uploadsStateFile;
  if (typeof uploadsStateFile !== 'string') return;
  const resolvedStateFile = resolve(uploadsStateFile);
  if (
    dirname(resolvedStateFile) !== resolve(tmpdir()) ||
    !resolvedStateFile.split('/').pop()?.startsWith('guteli-playwright-roots-')
  ) {
    return;
  }

  const roots = (await readFile(resolvedStateFile, 'utf8').catch(() => ''))
    .split('\n')
    .map((root) => root.trim())
    .filter(Boolean);
  for (const root of roots) {
    const resolvedRoot = resolve(root);
    if (
      dirname(resolvedRoot) !== resolve(tmpdir()) ||
      !resolvedRoot.split('/').pop()?.startsWith('guteli-playwright-')
    ) {
      continue;
    }
    const stats = await lstat(resolvedRoot).catch(() => null);
    if (!stats || !stats.isDirectory() || stats.isSymbolicLink()) continue;
    await rm(resolvedRoot, { recursive: true, force: true });
  }
  await unlink(resolvedStateFile).catch(() => undefined);
}
