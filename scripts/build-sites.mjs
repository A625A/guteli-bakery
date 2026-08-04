import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import ts from 'typescript';

const projectRoot = process.cwd();
const exportDirectory = path.join(projectRoot, 'out');
const distributionDirectory = path.join(projectRoot, 'dist');
const clientDirectory = path.join(distributionDirectory, 'client');
const serverDirectory = path.join(distributionDirectory, 'server');
const workerSourcePath = path.join(projectRoot, 'hosting', 'sites-worker.ts');

await rm(distributionDirectory, { force: true, recursive: true });
await mkdir(serverDirectory, { recursive: true });
await cp(exportDirectory, clientDirectory, { recursive: true });

const workerSource = await readFile(workerSourcePath, 'utf8');
const workerModule = ts.transpileModule(workerSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: workerSourcePath,
  reportDiagnostics: true,
});

const errors = workerModule.diagnostics?.filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);

if (errors?.length) {
  throw new Error(
    errors
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      )
      .join('\n'),
  );
}

await writeFile(
  path.join(serverDirectory, 'index.js'),
  workerModule.outputText,
  'utf8',
);
