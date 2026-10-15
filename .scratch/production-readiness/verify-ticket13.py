"""Local Ticket13 verification; DB/browser profiles must run sequentially."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
logs = Path('/private/tmp/guteli-ticket13-harness')
logs.mkdir(exist_ok=True)
checks = {
    'unit': ['npm', 'test', '--', '--maxWorkers=1'],
    'integration': ['npm', 'run', 'test:integration'],
    'admin-browser': ['node_modules/.bin/playwright', 'test', 'tests/browser/admin-orders.spec.ts', 'tests/browser/admin-shell.spec.ts', 'tests/browser/admin-catalog.spec.ts', '--project=admin', '--no-deps', '--output=' + str(logs / 'admin-results')],
    'checkout-browser': ['node_modules/.bin/playwright', 'test', 'tests/browser/order-journey.spec.ts', '--project=storefront', '--no-deps'],
    'summary-browser': ['node_modules/.bin/playwright', 'test', '--config=playwright.summary.config.ts', '--project=storefront', '--no-deps'],
    'types': ['npm', 'run', 'typecheck'],
    'lint': ['npm', 'run', 'lint'],
    'build': ['npm', 'run', 'build'],
}
for name in sys.argv[1:]:
    path = logs / (name + '.log')
    with path.open('w') as stream:
        result = subprocess.run(checks[name], cwd=root, stdout=stream, stderr=subprocess.STDOUT)
    print(f'{name}: exit={result.returncode}; log={path}', flush=True)
    print('\n'.join(path.read_text().splitlines()[-12:]), flush=True)
    if result.returncode:
        sys.exit(result.returncode)
