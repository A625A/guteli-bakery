import { notFound } from 'next/navigation';

import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MissingAdminPage() {
  await requireVerifiedAdminSession();
  notFound();
}
