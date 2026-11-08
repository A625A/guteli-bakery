import 'server-only';
import { getDeployStore, getStore, type Store } from '@netlify/blobs';
import { validateStorageKey, storagePublicUrl } from './key';
import {
  MAX_OBJECT_BYTES,
  type ObjectStorage,
  type StoragePutMetadata,
} from './types';

// Inlined by next.config.ts from Netlify's build context. Never trust a request
// header or share a site-wide production store with Deploy Preview writes.
const deployContext = process.env.GUTELI_DEPLOY_CONTEXT;
const STORE_NAME = 'guteli-product-images';
function openStore(): Store {
  const options = {
    name: STORE_NAME,
    consistency: 'strong' as const,
    region: 'us-east-2' as const,
    fetch: ((input, init) =>
      fetch(input, {
        ...init,
        signal: AbortSignal.any([
          ...(init?.signal ? [init.signal] : []),
          AbortSignal.timeout(10_000),
        ]),
      })) as typeof fetch,
  };
  return deployContext === 'production'
    ? getStore(options)
    : getDeployStore(options);
}

/** Private blobs; public/admin routes continue to authorize every media lookup. */
export class NetlifyObjectStorage implements ObjectStorage {
  async putIfMissing(
    key: string,
    body: Uint8Array,
    metadata?: StoragePutMetadata,
  ) {
    validateStorageKey(key);
    if (!body.byteLength || body.byteLength > MAX_OBJECT_BYTES)
      throw new Error('Invalid storage object.');
    try {
      const result = await openStore().set(key, Uint8Array.from(body).buffer, {
        onlyIfNew: true,
        metadata: metadata?.contentType
          ? { contentType: metadata.contentType }
          : {},
      });
      return result.modified;
    } catch {
      throw new Error('Unable to store object.');
    }
  }

  async read(key: string, maxBytes = MAX_OBJECT_BYTES): Promise<Buffer | null> {
    validateStorageKey(key);
    if (
      !Number.isSafeInteger(maxBytes) ||
      maxBytes <= 0 ||
      maxBytes > MAX_OBJECT_BYTES
    )
      throw new Error('Invalid storage read limit.');
    try {
      const stream = await openStore().get(key, { type: 'stream' });
      if (!stream) return null;
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) throw new Error('Invalid storage object.');
          chunks.push(value);
        }
        if (!size) throw new Error('Invalid storage object.');
        return Buffer.concat(chunks, size);
      } catch (error) {
        await reader.cancel().catch(() => undefined);
        throw error;
      } finally {
        reader.releaseLock();
      }
    } catch {
      throw new Error('Unable to read object.');
    }
  }

  async delete(key: string) {
    validateStorageKey(key);
    try {
      const store = openStore();
      if (!(await store.getMetadata(key))) return false;
      await store.delete(key);
      return true;
    } catch {
      throw new Error('Unable to delete object.');
    }
  }

  publicUrl = storagePublicUrl;

  async checkAccess() {
    try {
      // No mutation, customer data or directory needed. Missing key is normal.
      await openStore().getMetadata('__guteli_readiness__');
      return true;
    } catch {
      return false;
    }
  }
}
