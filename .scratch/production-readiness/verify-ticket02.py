"""Targeted Ticket02 checks; full logs stay outside conversation context."""
import pathlib, subprocess, sys
root = pathlib.Path(__file__).resolve().parents[2]
logs = pathlib.Path('/private/tmp/guteli-ticket02-harness')
logs.mkdir(exist_ok=True)
checks = {
 'unit': ['npm', 'test', '--', '--exclude', 'tests/unit/docker-runtime.test.ts'],
 'integration': ['npm', 'run', 'test:integration', '--', *['tests/integration/' + name + '.test.ts' for name in ['checkout-pricing','checkout-session','create-order','create-order-concurrency','admin-orders','admin-catalog','admin-boundary-matrix','public-products','promotion-catalog']]],
 'browser': ['node_modules/.bin/playwright', 'test', *['tests/browser/' + name + '.spec.ts' for name in ['order-journey','menu','products-api','admin-orders']], '--no-deps'],
 'contracts': ['npm','run','test:integration','--','tests/integration/order-api.test.ts','tests/integration/receipt-api.test.ts','tests/integration/admin-orders.test.ts'],
 'admin-browser': ['node_modules/.bin/playwright','test','tests/browser/admin-orders.spec.ts','--project=admin','--no-deps'],
 'pricing': ['npm','run','test:integration','--','tests/integration/checkout-pricing.test.ts','tests/integration/checkout-session.test.ts'],
 'build': ['npm','run','build'],
 'types': ['npm','run','typecheck'],
 'lint': ['npm','run','lint'],
}
for name in sys.argv[1:]:
 command = checks[name]
 with (logs / (name + '.log')).open('w') as stream:
  result = subprocess.run(command, cwd=root, stdout=stream, stderr=subprocess.STDOUT)
 lines = (logs / (name + '.log')).read_text().splitlines()
 print(f'{name}: exit={result.returncode}; log={logs / (name + ".log")}', flush=True)
 print('\n'.join(lines[-8:] if result.returncode == 0 else lines[-35:]), flush=True)
 if result.returncode: sys.exit(result.returncode)
