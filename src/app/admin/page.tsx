import Link from 'next/link';
import { getOperationsSummary } from '@/server/operations/summary';
import { SessionActions } from '@/components/admin/SessionActions';
import { DashboardRefresh } from '@/components/admin/DashboardRefresh';
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel';
import { orderStatusLabel } from '@/lib/order-status-label';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { getAdminDashboard } from '@/server/admin/dashboard';
const cards = [
  ['RECEIVED', 'Por confirmar', 'Revisar pedidos'],
  ['PREPARING', 'En preparación', 'En cocina'],
  ['READY', 'Listos para entregar', 'Preparados'],
  ['OUT_FOR_DELIVERY', 'En reparto', 'Camino al cliente'],
] as const;
export default async function AdminPage({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const parameters = await searchParams;
  const analyticsQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string' && ['period', 'from', 'to'].includes(key))
      analyticsQuery.set(key, value);
  }
  await requireVerifiedAdminSession();
  const [d, operations] = await Promise.all([
    getAdminDashboard(),
    getOperationsSummary(),
  ]);
  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Tu panadería, de un vistazo</p>
          <h1>Panel administrativo</h1>
          <p>Buen día, Güteli. Esto es lo que necesita tu atención.</p>
        </div>
        <details className="admin-account-menu">
          <summary>Mi cuenta</summary>
          <SessionActions />
        </details>
      </header>
      <section aria-label="Operación actual">
        <div className="admin-dashboard__cards">
          {cards.map(([status, title, foot]) => (
            <Link
              href={'/admin/orders?status=' + status}
              key={status}
              className="admin-dashboard__card"
            >
              <span>{title}</span>
              <strong>{d.orderCounts[status]}</strong>
              <span className="admin-card-foot">{foot}</span>
            </Link>
          ))}
        </div>
        <div className="admin-mini-stats" style={{ marginTop: 14 }}>
          <Link href="/admin/orders?status=CONFIRMED">
            <strong>{d.orderCounts.CONFIRMED}</strong> confirmados por preparar
          </Link>
          <span>
            <strong>{d.ordersReceivedTodayCount}</strong> recibidos hoy
          </span>
          <span>
            <strong>{d.completedTodayCount}</strong> completados hoy
          </span>
          <span>
            <strong>{d.actionableOrderCount}</strong> abiertos en total
          </span>
        </div>
      </section>
      {d.failedNotificationCount > 0 || d.pendingNotificationCount > 0 ? (
        <section className="admin-panel" aria-label="Avisos">
          <h2>Notificaciones por revisar</h2>
          <p>
            {d.failedNotificationCount} fallidas · {d.pendingNotificationCount}{' '}
            pendientes. Revisa el detalle del pedido para consultar su estado.
          </p>
        </section>
      ) : null}
      <AnalyticsPanel initialQuery={analyticsQuery.toString() || 'period=7'} />
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Pedidos recientes</h2>
            <p>
              Los pendientes anteriores siguen incluidos en la operación actual.
            </p>
          </div>
          <div className="admin-toolbar">
            <Link
              href={
                '/admin/orders?date=' +
                new Intl.DateTimeFormat('en-CA', {
                  timeZone: 'America/Guatemala',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                }).format(new Date())
              }
              className="admin-secondary"
            >
              Entregas de hoy
            </Link>
            <Link href="/admin/orders" className="admin-secondary">
              Ver pedidos
            </Link>
          </div>
        </div>
        {d.recentOrders.length ? (
          <div className="admin-dashboard__table-wrap admin-responsive-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Referencia</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Entrega</th>
                  <th scope="col">Fecha solicitada</th>
                </tr>
              </thead>
              <tbody>
                {d.recentOrders.slice(0, 5).map((o) => (
                  <tr key={o.publicId}>
                    <th scope="row">
                      <Link href={'/admin/orders/' + o.publicId}>
                        {o.publicId}
                      </Link>
                    </th>
                    <td data-label="Estado">
                      <span className="admin-badge" data-state={o.orderStatus}>
                        {orderStatusLabel(o.orderStatus)}
                      </span>
                    </td>
                    <td data-label="Entrega">
                      {o.fulfillment === 'DELIVERY'
                        ? 'A domicilio'
                        : 'Recogida'}
                    </td>
                    <td data-label="Fecha">{o.requestedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">
            Todavía no hay pedidos. Aquí verás las solicitudes recibidas en la
            tienda.
          </p>
        )}
      </section>

      <section className="admin-panel">
        <h2>Tu catálogo</h2>
        <div className="admin-mini-stats">
          <Link href="/admin/products?state=active">
            {d.activeProductCount} productos activos en categorías activas
          </Link>
          <span>{d.unavailableProductCount} agotados</span>
          <span>{d.lowStockProductCount} con pocas existencias (1–5)</span>
        </div>
      </section>
      <section
        className="admin-panel admin-operations"
        aria-labelledby="operations-title"
      >
        <h2 id="operations-title">Estado de la tienda</h2>
        <p>
          Se actualiza con este panel. No envía alertas con el panel cerrado.
        </p>
        <div className="admin-dashboard__cards">
          {operations.map((item) => (
            <article key={item.key} className="admin-dashboard__card">
              <h3>{item.label}</h3>
              <strong>
                {
                  {
                    ok: 'Comprobado',
                    attention: 'Necesita atención',
                    unknown: 'Sin comprobar',
                    disabled: 'Desactivado',
                  }[item.state]
                }
              </strong>
              <p>{item.message}</p>
            </article>
          ))}
        </div>
      </section>

      <details className="admin-refresh">
        <summary>Actualización y seguimiento del panel</summary>
        <DashboardRefresh refreshedAt={new Date().toISOString()} />
      </details>
    </main>
  );
}
