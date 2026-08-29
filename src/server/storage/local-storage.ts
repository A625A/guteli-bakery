import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, unlink, link, lstat } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import { MAX_OBJECT_BYTES } from './types';
import type { ObjectStorage } from './types';

const PUBLIC_OBJECT_MODE = 0o644;

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

async function ensureStorageRoot(root: string, create: boolean) {
  if (create) await mkdir(root, { recursive: true });

  try {
    const stats = await lstat(root);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error('Invalid storage root.');
    }
    return true;
  } catch (error: unknown) {
    if (!create && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function assertSingleLinkFile(stats: { isFile(): boolean; nlink: number }) {
  if (!stats.isFile() || stats.nlink !== 1) {
    throw new Error('Invalid storage object.');
  }
}

async function ensurePublicObjectMode(target: string) {
  const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await file.stat();
    assertSingleLinkFile(stats);
    await file.chmod(PUBLIC_OBJECT_MODE);
  } finally {
    await file.close();
  }
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
      await ensureStorageRoot(this.root, true);
      try {
        const existing = await lstat(target);
        if (existing.isSymbolicLink())
          throw new Error('Invalid storage object.');
        await ensurePublicObjectMode(target);
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
        PUBLIC_OBJECT_MODE,
      );
      temporaryExists = true;
      try {
        await file.chmod(PUBLIC_OBJECT_MODE);
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
          if (existing) await ensurePublicObjectMode(target);
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

  async read(key: string, maxBytes = MAX_OBJECT_BYTES): Promise<Buffer | null> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
      throw new Error('Invalid storage read limit.');
    }
    const target = this.leaf(key);
    try {
      const rootExists = await ensureStorageRoot(this.root, false);
      if (!rootExists) return null;
      const file = await open(
        target,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        const initialStats = await file.stat();
        if (
          initialStats.nlink !== 1 ||
          !initialStats.isFile() ||
          initialStats.size <= 0 ||
          initialStats.size > maxBytes
        ) {
          throw new Error('Invalid storage object.');
        }
        const body = Buffer.allocUnsafe(initialStats.size);
        const result = await file.read(body, 0, body.byteLength, 0);
        const finalStats = await file.stat();
        if (
          finalStats.nlink !== 1 ||
          result.bytesRead !== body.byteLength ||
          finalStats.size !== initialStats.size
        ) {
          throw new Error('Invalid storage object.');
        }
        return body;
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
