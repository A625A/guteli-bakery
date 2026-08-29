export type StoragePutMetadata = Readonly<{
  contentType?: string;
}>;

export const MAX_OBJECT_BYTES = 8 * 1024 * 1024;

export interface ObjectStorage {
  putIfMissing(
    key: string,
    body: Uint8Array,
    metadata?: StoragePutMetadata,
  ): Promise<boolean>;
  read(key: string, maxBytes?: number): Promise<Buffer | null>;
  publicUrl(key: string): string;
}
