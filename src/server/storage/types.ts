export type StoragePutMetadata = Readonly<{
  contentType?: string;
}>;

export interface ObjectStorage {
  putIfMissing(
    key: string,
    body: Uint8Array,
    metadata?: StoragePutMetadata,
  ): Promise<boolean>;
  read(key: string): Promise<Buffer | null>;
  publicUrl(key: string): string;
}
