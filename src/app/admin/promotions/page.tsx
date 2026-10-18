import { headers } from 'next/headers';
import { PromotionsTable } from '@/components/admin/PromotionsTable';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { adminPromotionEditor } from '@/server/products/admin-promotions';
export const dynamic = 'force-dynamic';
export default async function AdminPromotionsPage() {
  await requireVerifiedAdminSession();
  const data = await adminPromotionEditor(await headers());
  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <PromotionsTable {...data} now={new Date().toISOString()} />
    </main>
  );
}
