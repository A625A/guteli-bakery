import path from 'node:path';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('ESLint portability', () => {
  it('ignores generated files inside repository-owned worktrees', async () => {
    const eslint = new ESLint({ cwd: process.cwd() });
    const generatedFile = path.join(
      process.cwd(),
      '.worktrees',
      'feature',
      '.next',
      'server',
      'page.js',
    );

    await expect(eslint.isPathIgnored(generatedFile)).resolves.toBe(true);
  });
});
