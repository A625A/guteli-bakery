import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, unlink, link, lstat } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import type { ObjectStorage } from './types';

function validateKey(key: string) {
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

  return key;
}

export class LocalObjectStorage implements ObjectStorage {
  private readonly root: string;

  constructor(root: string) {
    if (typeof root !== 'string' || root.trim().length === 0) {
      throw new Error('UPLOADS_ROOT must not be empty.');
    }
    this.root = resolve(root);
  }

  private leaf(key: string) {
    validateKey(key);
    return join(this.root, createHash('sha256').update(key).digest('hex'));
  }

  async putIfMissing(key: string, body: Uint8Array): Promise<boolean> {
    const target = this.leaf(key);
    const temporary = join(this.root, `.${randomUUID()}.tmp`);
    let temporaryExists = false;

    try {
      await mkdir(this.root, { recursive: true });
      try {
        const existing = await lstat(target);
        if (existing.isSymbolicLink())
          throw new Error('Invalid storage object.');
        return false;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      const file = await open(
        temporary,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
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
        return true;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          const existing = await lstat(target).catch(() => null);
          if (existing?.isSymbolicLink())
            throw new Error('Invalid storage object.');
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
    const target = this.leaf(key);
    try {
      const file = await open(
        target,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        return await file.readFile();
      } finally {
        await file.close();
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      if ((error as NodeJS.ErrnoException).code === 'ELOOP') {
        throw new Error('Invalid storage object.');
      }
      throw new Error('Unable to read object.');
    }
  }

  publicUrl(key: string) {
    validateKey(key);
    return `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
}
