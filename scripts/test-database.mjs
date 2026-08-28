import { spawnSync } from 'node:child_process';

const TEST_PROJECT = 'guteli-test';
const TEST_DATABASE = 'guteli_test';
const TEST_DATABASE_PORT = '55433';

const actions = {
  up: ['up', '-d', '--wait', 'database'],
  down: ['down', '--volumes', '--remove-orphans'],
};

const action = process.argv[2];
const composeAction = actions[action];

if (!composeAction) {
  console.error('Usage: node scripts/test-database.mjs <up|down>');
  process.exitCode = 1;
} else {
  const environment = {
    ...process.env,
    GUTELI_DATABASE_NAME: TEST_DATABASE,
    GUTELI_DATABASE_PORT: TEST_DATABASE_PORT,
  };
  const invocations = [
    ['docker', ['compose', '--project-name', TEST_PROJECT, ...composeAction]],
    ['docker-compose', ['--project-name', TEST_PROJECT, ...composeAction]],
  ];
  let lastResult;
  let succeeded = false;

  for (const [command, args] of invocations) {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      env: environment,
    });
    lastResult = result;

    if (!result.error && result.status === 0) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      succeeded = true;
      break;
    }
  }

  if (!succeeded) {
    if (lastResult?.stderr) process.stderr.write(lastResult.stderr);
    console.error('Unable to run the isolated test database lifecycle.');
    process.exitCode = 1;
  }
}
