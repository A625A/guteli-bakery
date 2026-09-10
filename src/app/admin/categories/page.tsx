import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CategoryForm } from '@/components/admin/CategoryForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { adminListCategories } from '@/server/products/admin-categories';
import { parseAdminCatalogPagination } from '@/server/products/admin-contracts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Categorías | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pagination(parameters: Awaited<SearchParams>) {
  for (const [key, value] of Object.entries(parameters)) {
    if ((key !== 'page' && key !== 'pageSize') || typeof value !== 'string')
      notFound();
  }
  try {
    return parseAdminCatalogPagination(parameters);
  } catch (error) {
    if (error instanceof RangeError) notFound();
    throw error;
  }
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireVerifiedAdminSession();
  const requested = pagination(await searchParams);
  const result = await adminListCategories(await headers(), requested);
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (result.page > lastPage) redirect('/admin/categories');

  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Catálogo persistente</p>
          <h1>Categorías</h1>
          <p>Revisa el impacto de una categoría antes de desactivarla.</p>
        </div>
      </header>
      <CategoryForm />
      <section aria-labelledby="category-list-title">
        <h2 id="category-list-title">Categorías existentes</h2>
        {result.categories.map((category) => (
          <CategoryForm key={category.id} category={category} />
        ))}
      </section>
      <nav aria-label="Paginación de categorías">
        {result.page > 1 ? (
          <Link
            href={`/admin/categories?page=${result.page - 1}&pageSize=${result.pageSize}`}
          >
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true">Anterior</span>
        )}
        <p>
          Página {result.page} de {lastPage}
        </p>
        {result.page < lastPage ? (
          <Link
            href={`/admin/categories?page=${result.page + 1}&pageSize=${result.pageSize}`}
          >
            Siguiente
          </Link>
        ) : (
          <span aria-disabled="true">Siguiente</span>
        )}
      </nav>
    </main>
  );
}
