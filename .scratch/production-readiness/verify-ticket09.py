"""Focused local Ticket09 checks. Never run DB/browser profiles concurrently."""
import pathlib
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parents[2]
logs = pathlib.Path('/private/tmp/guteli-ticket09-harness')
logs.mkdir(exist_ok=True)
checks = {
    'automation-integration': ['npm', 'run', 'test:integration'],
    'automation-unit': ['npm', 'test', '--', '--maxWorkers=1', 'tests/unit/whatsapp-automation-provider.test.ts', 'tests/unit/whatsapp-consent.test.ts', 'tests/unit/whatsapp-provider.test.ts', 'tests/unit/owner-notification.test.ts'],
    'unit': ['npm', 'test', '--', '--maxWorkers=1'],
    'summary-unit': ['npm', 'test', '--', 'tests/unit/checkout-summary.test.ts', 'tests/unit/order.test.ts'],
    'integration': ['npm', 'run', 'test:integration', '--', *['tests/integration/' + name + '.test.ts' for name in ['checkout-summary', 'checkout-pricing', 'checkout-session', 'order-api', 'receipt-api']]],
    'browser': ['node_modules/.bin/playwright', 'test', '--config=playwright.summary.config.ts', '--project=storefront', '--no-deps'],
    'checkout-browser': ['node_modules/.bin/playwright', 'test', 'tests/browser/order-journey.spec.ts', '--project=storefront', '--no-deps'],
    'types': ['npm', 'run', 'typecheck'],
    'lint': ['npm', 'run', 'lint'],
    'build': ['npm', 'run', 'build'],
}
for name in sys.argv[1:]:
    path = logs / (name + '.log')
    with path.open('w') as stream:
        result = subprocess.run(checks[name], cwd=root, stdout=stream, stderr=subprocess.STDOUT)
    print(f'{name}: exit={result.returncode}; log={path}', flush=True)
    lines = path.read_text().splitlines()
    print('\n'.join(lines[-10:]), flush=True)
    if result.returncode:
        sys.exit(result.returncode)
