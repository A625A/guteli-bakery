import { getUploadsRoot } from '@/server/config/env';
import { isNetlify } from '@/server/config/platform';

import { LocalObjectStorage } from './local-storage';
import { NetlifyObjectStorage } from './netlify-storage';
import type { ObjectStorage } from './types';

export function createObjectStorage(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStorage {
  const provider =
    env.STORAGE_PROVIDER ?? (isNetlify(env) ? 'netlify-blobs' : 'local');
  if (provider === 'netlify-blobs') return new NetlifyObjectStorage();
  if (provider !== 'local' || isNetlify(env))
    throw new Error('Invalid storage configuration.');
  return new LocalObjectStorage(getUploadsRoot(env));
}

export { LocalObjectStorage } from './local-storage';
export {
  MAX_OBJECT_BYTES,
  type ObjectStorage,
  type StoragePutMetadata,
} from './types';
