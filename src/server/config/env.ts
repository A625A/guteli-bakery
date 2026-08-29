import 'server-only';

import { resolve } from 'node:path';

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  UPLOADS_ROOT: z.string().trim().min(1).optional(),
});

export function parseServerEnv(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error('Invalid server environment');
  }

  return result.data;
}

export const getServerEnv = () => parseServerEnv(process.env);

export function getUploadsRoot(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.pick({ NODE_ENV: true, UPLOADS_ROOT: true }).parse(env);
  return resolve(
    parsed.UPLOADS_ROOT ??
      (parsed.NODE_ENV === 'development' ? 'uploads_data' : '/app/uploads'),
  );
}
