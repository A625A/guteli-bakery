import 'server-only';

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
});

export function parseServerEnv(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error('Invalid server environment');
  }

  return result.data;
}

export const getServerEnv = () => parseServerEnv(process.env);
