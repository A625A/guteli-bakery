import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ProductForm } from '@/components/admin/ProductForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { adminListCategories } from '@/server/products/admin-categories';
import { parseAdminCatalogPagination } from '@/server/products/admin-contracts';
import { adminListProducts } from '@/server/products/admin-products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Productos | Administración',
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

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireVerifiedAdminSession();
  const requested = pagination(await searchParams);
  const requestHeaders = await headers();
  const [result, categoryResult] = await Promise.all([
    adminListProducts(requestHeaders, requested),
    adminListCategories(requestHeaders, { page: 1, pageSize: 100 }),
  ]);
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (result.page > lastPage) redirect('/admin/products');

  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Catálogo persistente</p>
          <h1>Productos</h1>
          <p>
            Crea y ordena productos; los cambios públicos aparecen en la
            siguiente solicitud.
          </p>
        </div>
      </header>
      <ProductForm
        categories={categoryResult.categories}
        categoryTotal={categoryResult.total}
      />
      <div className="admin-dashboard__table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Categoría</th>
              <th scope="col">Precio</th>
              <th scope="col">Existencia</th>
              <th scope="col">Estado</th>
              <th scope="col">Editar</th>
            </tr>
          </thead>
          <tbody>
            {result.products.map((product) => (
              <tr key={product.id}>
                <th scope="row">{product.name}</th>
                <td>{product.categoryName}</td>
                <td>Q{(product.priceMinor / 100).toFixed(2)}</td>
                <td>
                  {product.stockQuantity === null
                    ? 'Sin control'
                    : product.stockQuantity}
                </td>
                <td>
                  {product.deletedAt
                    ? 'Retirado'
                    : product.active
                      ? 'Activo'
                      : 'Inactivo'}
                </td>
                <td>
                  <Link
                    href={`/admin/products/${product.id}`}
                    aria-label={`Editar ${product.name}`}
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Paginación de productos">
        {result.page > 1 ? (
          <Link
            href={`/admin/products?page=${result.page - 1}&pageSize=${result.pageSize}`}
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
            href={`/admin/products?page=${result.page + 1}&pageSize=${result.pageSize}`}
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
