import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { adminListCategories } from '@/server/products/admin-categories';
import {
  parseAdminCatalogPagination,
  parseAdminCategorySearch,
} from '@/server/products/admin-contracts';
export const dynamic = 'force-dynamic';
export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireVerifiedAdminSession();
  const params = await searchParams;
  const query: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (!['page', 'pageSize', 'search'].includes(k) || typeof v !== 'string')
      notFound();
    query[k] = v;
  }
  let filters;
  try {
    filters = {
      ...parseAdminCatalogPagination(query),
      search: parseAdminCategorySearch(query.search),
    };
  } catch {
    notFound();
  }
  const result = await adminListCategories(await headers(), filters);
  const last = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (result.page > last)
    redirect(
      '/admin/categories?' +
        new URLSearchParams({ ...query, page: String(last) }),
    );
  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <h1>Categorías</h1>
          <p>Organiza los sabores de tu catálogo.</p>
        </div>
        <AdminDrawer title="Agregar categoría" trigger="Agregar categoría">
          <CategoryForm />
        </AdminDrawer>
      </header>
      <form className="admin-toolbar" method="get">
        <label>
          Buscar categorías
          <input
            type="search"
            name="search"
            maxLength={160}
            defaultValue={filters.search}
            placeholder="Nombre de categoría…"
          />
        </label>
        <button>Buscar</button>
      </form>
      <div className="admin-dashboard__table-wrap admin-responsive-table">
        <table>
          <thead>
            <tr>
              {[
                'Categoría',
                'Productos activos',
                'Orden',
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
            {result.categories.map((c) => (
              <tr key={c.id}>
                <th scope="row">{c.name}</th>
                <td data-label="Productos activos">{c.productCount}</td>
                <td data-label="Orden">{c.sortOrder}</td>
                <td data-label="Estado">
                  <span
                    className="admin-badge"
                    data-state={c.active ? 'active' : 'inactive'}
                  >
                    {c.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td>
                  <AdminDrawer
                    title={'Editar ' + c.name}
                    trigger={'Editar ' + c.name}
                  >
                    <CategoryForm category={c} />
                  </AdminDrawer>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.total ? (
          <p className="admin-empty">
            No hay categorías que coincidan con tu búsqueda.
          </p>
        ) : null}
      </div>
      <AdminPagination
        path="/admin/categories"
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        query={query}
      />
    </main>
  );
}
