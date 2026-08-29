import { getUploadsRoot } from '@/server/config/env';

import { LocalObjectStorage } from './local-storage';
import type { ObjectStorage } from './types';

export function createObjectStorage(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStorage {
  return new LocalObjectStorage(getUploadsRoot(env));
}

export { LocalObjectStorage } from './local-storage';
export type { ObjectStorage, StoragePutMetadata } from './types';
