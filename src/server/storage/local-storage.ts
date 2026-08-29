import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, unlink, link } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import type { ObjectStorage } from './types';

function validateKey(root: string, key: string) {
  if (
    typeof key !== 'string' ||
    key.length === 0 ||
    key.includes('\\') ||
    key.includes('\0') ||
    key.startsWith('/') ||
    isAbsolute(key) ||
    /^[A-Za-z]:/.test(key)
  ) {
    throw new Error('Invalid storage key.');
  }

  const segments = key.split('/');
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    throw new Error('Invalid storage key.');
  }

  const resolvedRoot = resolve(root);
  const target = resolve(resolvedRoot, key);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}/`)) {
    throw new Error('Invalid storage key.');
  }
  return target;
}

export class LocalObjectStorage implements ObjectStorage {
  private readonly root: string;

  constructor(root: string) {
    if (typeof root !== 'string' || root.trim().length === 0) {
      throw new Error('UPLOADS_ROOT must not be empty.');
    }
    this.root = resolve(root);
  }

  async putIfMissing(key: string, body: Uint8Array): Promise<boolean> {
    const target = validateKey(this.root, key);
    const directory = dirname(target);
    const temporary = join(directory, `.${randomUUID()}.tmp`);
    let temporaryExists = false;

    try {
      await mkdir(directory, { recursive: true });
      const file = await open(temporary, 'wx');
      temporaryExists = true;
      try {
        await file.writeFile(body);
        await file.sync();
      } finally {
        await file.close();
      }

      try {
        // link() publishes atomically and refuses to replace an existing object.
        await link(temporary, target);
        temporaryExists = false;
        return true;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          return false;
        }
        throw error;
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        return false;
      }
      throw new Error('Unable to store object.');
    } finally {
      if (temporaryExists) {
        await unlink(temporary).catch(() => undefined);
      }
    }
  }

  async read(key: string): Promise<Buffer | null> {
    const target = validateKey(this.root, key);
    try {
      return await readFile(target);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new Error('Unable to read object.');
    }
  }

  publicUrl(key: string) {
    validateKey(this.root, key);
    return `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
}
