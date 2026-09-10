import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { ProductForm } from '@/components/admin/ProductForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import {
  adminGetCategory,
  adminListCategories,
} from '@/server/products/admin-categories';
import { adminGetProduct } from '@/server/products/admin-products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Editar producto | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireVerifiedAdminSession();
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success) notFound();
  const requestHeaders = await headers();
  const [product, categoryResult] = await Promise.all([
    adminGetProduct(parsed.data, requestHeaders),
    adminListCategories(requestHeaders, { page: 1, pageSize: 100 }),
  ]);
  if (!product) notFound();
  const currentCategory = categoryResult.categories.find(
    (category) => category.id === product.categoryId,
  );
  const missingCurrentCategory = currentCategory
    ? null
    : await adminGetCategory(product.categoryId, requestHeaders);
  const completeCategories = currentCategory
    ? categoryResult.categories
    : [
        ...(missingCurrentCategory ? [missingCurrentCategory] : []),
        ...categoryResult.categories,
      ];

  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Catálogo persistente</p>
          <h1>Editar {product.name}</h1>
          <p>
            Versión {product.version}. Las imágenes actuales son informativas en
            esta fase.
          </p>
        </div>
        <Link href="/admin/products">Volver a productos</Link>
      </header>
      <ProductForm
        product={product}
        categories={completeCategories}
        categoryTotal={categoryResult.total}
      />
    </main>
  );
}
