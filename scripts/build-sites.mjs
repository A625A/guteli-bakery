const message =
  'build:sites is retired on this dynamic-runtime branch because Next standalone output cannot be packaged as a static Sites deployment.';

console.error(message);
process.exit(1);
