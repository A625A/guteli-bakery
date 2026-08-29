import { resolve } from 'node:path';

import { z } from 'zod';

export const uploadsRootValueSchema = z.string().trim().min(1);

const uploadsEnvironment = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  UPLOADS_ROOT: uploadsRootValueSchema.optional(),
});

export function resolveUploadsRoot(env: NodeJS.ProcessEnv = process.env) {
  const parsed = uploadsEnvironment.parse(env);
  if (!parsed.UPLOADS_ROOT) {
    if (parsed.NODE_ENV === 'production') return '/app/uploads';
    throw new Error('UPLOADS_ROOT is required outside production.');
  }
  return resolve(parsed.UPLOADS_ROOT);
}
