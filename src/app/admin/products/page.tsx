import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ProductForm } from '@/components/admin/ProductForm';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import {
  adminListCategories,
  adminGetCategory,
} from '@/server/products/admin-categories';
import {
  parseAdminCatalogPagination,
  parseProductFilters,
} from '@/server/products/admin-contracts';
import { adminListProducts } from '@/server/products/admin-products';
export const dynamic = 'force-dynamic';
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireVerifiedAdminSession();
  const params = await searchParams;
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (
      !['page', 'pageSize', 'search', 'state', 'category', 'sort'].includes(
        k,
      ) ||
      typeof v !== 'string'
    )
      notFound();
    query[k] = v;
  }
  let filters;
  try {
    filters = {
      ...parseAdminCatalogPagination(query),
      ...parseProductFilters(query),
    };
  } catch {
    notFound();
  }
  const h = await headers();
  const [result, categories] = await Promise.all([
    adminListProducts(h, filters),
    adminListCategories(h, { pageSize: 100 }),
  ]);
  const missingIds = [
    ...new Set([
      ...result.products.map((p) => p.categoryId),
      ...(filters.category ? [filters.category] : []),
    ]),
  ].filter((id) => !categories.categories.some((c) => c.id === id));
  const extra = await Promise.all(
    missingIds.map((id) => adminGetCategory(id, h)),
  );
  const choices = [
    ...categories.categories,
    ...extra.filter((c): c is NonNullable<typeof c> => !!c),
  ];
  const last = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (result.page > last)
    redirect(
      '/admin/products?' +
        new URLSearchParams({ ...query, page: String(last) }),
    );
  const editor = (product?: (typeof result.products)[number]) => (
    <ProductForm
      product={product}
      categories={choices}
      categoryTotal={categories.total}
    />
  );
  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <h1>Productos</h1>
          <p>Tu catálogo, listo para el próximo pedido.</p>
        </div>
        <AdminDrawer title="Agregar producto" trigger="Agregar producto">
          {editor()}
        </AdminDrawer>
      </header>
      <form className="admin-toolbar" method="get">
        <label>
          Buscar productos
          <input
            type="search"
            name="search"
            placeholder="Nombre del producto…"
            defaultValue={filters.search}
            maxLength={160}
          />
        </label>
        <label>
          Categoría
          <select name="category" defaultValue={filters.category ?? ''}>
            <option value="">Todas las categorías</option>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select name="state" defaultValue={filters.state}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="out">Agotados</option>
            <option value="retired">Retirados</option>
          </select>
        </label>
        <label>
          Ordenar
          <select name="sort" defaultValue={filters.sort}>
            <option value="catalog">Orden del catálogo</option>
            <option value="name">Nombre</option>
            <option value="price">Precio menor primero</option>
          </select>
        </label>
        <button>Buscar</button>
      </form>
      <div className="admin-dashboard__table-wrap admin-responsive-table">
        <table>
          <thead>
            <tr>
              {[
                'Producto',
                'Categoría',
                'Precio',
                'Existencia',
                'Estado',
                'Acciones',
              ].map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.products.map((p) => (
              <tr key={p.id}>
                <th scope="row">
                  <div className="admin-product-name">
                    {p.images[0] ? (
                      <Image
                        src={
                          '/api/admin/media/' +
                          p.images[0].storageKey
                            .split('/')
                            .map(encodeURIComponent)
                            .join('/')
                        }
                        width={44}
                        height={44}
                        alt=""
                        unoptimized
                      />
                    ) : (
                      <span
                        className="admin-product-placeholder"
                        aria-hidden="true"
                      >
                        ♧
                      </span>
                    )}
                    <span>
                      {p.name}
                      <small>{p.saleUnit}</small>
                    </span>
                  </div>
                </th>
                <td data-label="Categoría">{p.categoryName}</td>
                <td data-label="Precio">
                  {new Intl.NumberFormat('es-GT', {
                    style: 'currency',
                    currency: 'GTQ',
                  }).format(p.priceMinor / 100)}
                </td>
                <td data-label="Existencia">
                  {p.stockQuantity ?? 'Sin control'}
                </td>
                <td data-label="Estado">
                  <span
                    className="admin-badge"
                    data-state={
                      p.active && !p.deletedAt ? 'active' : 'inactive'
                    }
                  >
                    {p.deletedAt
                      ? 'Retirado'
                      : p.active
                        ? 'Activo'
                        : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <AdminDrawer
                    title={'Editar ' + p.name}
                    trigger={'Editar ' + p.name}
                  >
                    {editor(p)}
                  </AdminDrawer>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.total ? (
          <p className="admin-empty">
            No hay productos que coincidan. Prueba otra búsqueda o agrega un
            producto.
          </p>
        ) : null}
      </div>
      <AdminPagination
        path="/admin/products"
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        query={query}
      />
    </main>
  );
}
