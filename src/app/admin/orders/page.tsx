import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import {
  adminListOrders,
  parseAdminOrderFilters,
} from '@/server/orders/admin-list-orders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Pedidos | Administración',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function filtersFrom(parameters: Awaited<SearchParams>) {
  const allowed = new Set([
    'page',
    'pageSize',
    'status',
    'fulfillment',
    'date',
  ]);
  for (const [key, value] of Object.entries(parameters)) {
    if (!allowed.has(key) || typeof value !== 'string') notFound();
  }
  try {
    return parseAdminOrderFilters(parameters);
  } catch (error) {
    if (error instanceof RangeError) notFound();
    throw error;
  }
}

function money(value: number | null) {
  return value === null ? 'Pendiente' : `Q${(value / 100).toFixed(2)}`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireVerifiedAdminSession();
  const filters = filtersFrom(await searchParams);
  const result = await adminListOrders(await headers(), filters);
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
  if (result.page > lastPage) redirect('/admin/orders');
  const pageHref = (page: number) => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(result.pageSize),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.fulfillment ? { fulfillment: filters.fulfillment } : {}),
      ...(filters.date ? { date: filters.date } : {}),
    });
    return `/admin/orders?${query}`;
  };

  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Operación interna</p>
          <h1>Pedidos</h1>
          <p>
            Consulta, cotiza y avanza pedidos sin exponer datos innecesarios.
          </p>
        </div>
      </header>
      <form method="get" className="admin-auth-card">
        <label htmlFor="orders-status">Estado</label>
        <select
          id="orders-status"
          name="status"
          defaultValue={filters.status ?? ''}
        >
          <option value="">Todos</option>
          <option value="RECEIVED">Recibido</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="PREPARING">En preparación</option>
          <option value="READY">Listo</option>
          <option value="OUT_FOR_DELIVERY">En camino</option>
          <option value="COMPLETED">Completado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <label htmlFor="orders-fulfillment">Entrega</label>
        <select
          id="orders-fulfillment"
          name="fulfillment"
          defaultValue={filters.fulfillment ?? ''}
        >
          <option value="">Todos</option>
          <option value="PICKUP">Recoger</option>
          <option value="DELIVERY">Entrega</option>
        </select>
        <label htmlFor="orders-date">Fecha solicitada</label>
        <input
          id="orders-date"
          name="date"
          type="date"
          defaultValue={filters.date}
        />
        <button type="submit">Filtrar</button>
      </form>
      <div className="admin-dashboard__table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Pedido</th>
              <th scope="col">Cliente</th>
              <th scope="col">Entrega</th>
              <th scope="col">Estado</th>
              <th scope="col">Total</th>
              <th scope="col">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {result.orders.map((order) => (
              <tr key={order.publicId}>
                <th scope="row">{order.publicId}</th>
                <td>{order.customerName}</td>
                <td>
                  {order.fulfillment === 'DELIVERY' ? 'Entrega' : 'Recoger'}
                </td>
                <td>{order.orderStatus}</td>
                <td>{money(order.totalMinor)}</td>
                <td>
                  <Link href={`/admin/orders/${order.publicId}`}>
                    Ver {order.publicId}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Paginación de pedidos">
        {result.page > 1 ? (
          <Link href={pageHref(result.page - 1)}>Anterior</Link>
        ) : (
          <span aria-disabled="true">Anterior</span>
        )}
        <p aria-live="polite">
          Página {result.page} de {lastPage}
        </p>
        {result.page < lastPage ? (
          <Link href={pageHref(result.page + 1)}>Siguiente</Link>
        ) : (
          <span aria-disabled="true">Siguiente</span>
        )}
      </nav>
    </main>
  );
}
