import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { PromotionForm } from '@/components/admin/PromotionForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { adminPromotionEditor } from '@/server/products/admin-promotions';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: 'Promociones | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function AdminPromotionsPage() {
  await requireVerifiedAdminSession();
  const data = await adminPromotionEditor(await headers());
  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <h1>Promociones</h1>
          <p>
            Horario de Guatemala. Finalizan automáticamente a la hora indicada.
            Si coinciden varias, se aplica solo el mayor descuento.
          </p>
        </div>
      </header>
      <PromotionForm products={data.products} />
      {data.promotions.map((promotion) => (
        <PromotionForm
          key={promotion.id}
          promotion={promotion}
          products={data.products}
        />
      ))}
    </main>
  );
}
