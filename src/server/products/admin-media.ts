import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';

import { requireAdmin } from '@/server/auth/authorize';
import { db } from '@/server/db/client';
import { productImages } from '@/server/db/schema';

export type AdminMediaRecord = Readonly<{
  storageKey: string;
  mimeType: string;
}>;

export async function findAdminMedia(
  storageKey: string,
  requestHeaders?: Headers,
): Promise<AdminMediaRecord | null> {
  await requireAdmin(requestHeaders);
  const [row] = await db
    .select({
      storageKey: productImages.storageKey,
      mimeType: productImages.mimeType,
    })
    .from(productImages)
    .where(
      and(
        eq(productImages.storageKey, storageKey),
        isNull(productImages.removedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
