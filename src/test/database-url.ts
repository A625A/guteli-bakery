export function requireTestDatabaseUrl(
  value: string | undefined,
  consumer: string,
) {
  if (!value) {
    throw new Error(`DATABASE_URL_TEST is required for ${consumer}.`);
  }

  let databaseUrl: URL;

  try {
    databaseUrl = new URL(value);
  } catch {
    throw new Error('DATABASE_URL_TEST must be a valid PostgreSQL URL.');
  }

  if (
    databaseUrl.protocol !== 'postgresql:' ||
    databaseUrl.pathname !== '/guteli_test'
  ) {
    throw new Error('DATABASE_URL_TEST must target the guteli_test database.');
  }

  return value;
}
