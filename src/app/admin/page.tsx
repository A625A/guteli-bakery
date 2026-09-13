import { SessionActions } from '@/components/admin/SessionActions';
import { DashboardRefresh } from '@/components/admin/DashboardRefresh';
import { requireVerifiedAdminSession } from '@/server/auth/admin-page-access';
import { getAdminDashboard } from '@/server/admin/dashboard';

const actionableStatuses = [
  ['RECEIVED', 'Recibidos'],
  ['CONFIRMED', 'Confirmados'],
  ['PREPARING', 'En preparación'],
  ['READY', 'Listos'],
  ['OUT_FOR_DELIVERY', 'En reparto'],
] as const;

export default async function AdminPage() {
  await requireVerifiedAdminSession();
  const dashboard = await getAdminDashboard();
  return (
    <main className="admin-dashboard" id="main-content" tabIndex={-1}>
      <DashboardRefresh />
      <header className="admin-dashboard__heading">
        <div>
          <p className="eyebrow">Operación diaria</p>
          <h1>Panel administrativo</h1>
          <p>Pedidos y notificaciones que necesitan seguimiento.</p>
        </div>
        <SessionActions />
      </header>

      <section aria-labelledby="orders-summary-title">
        <h2 id="orders-summary-title">Pedidos accionables</h2>
        <div className="admin-dashboard__cards">
          {actionableStatuses.map(([status, label]) => (
            <article key={status} className="admin-dashboard__card">
              <span>{label}</span>
              <strong>{dashboard.orderCounts[status]}</strong>
            </article>
          ))}
          <article className="admin-dashboard__card">
            <span>Pedidos recibidos hoy (Guatemala)</span>
            <strong>{dashboard.ordersReceivedTodayCount}</strong>
          </article>
          <article className="admin-dashboard__card">
            <span>Pedidos accionables (no terminales)</span>
            <strong>{dashboard.actionableOrderCount}</strong>
          </article>
          <article className="admin-dashboard__card">
            <span>Notificaciones pendientes de envío</span>
            <strong>{dashboard.pendingNotificationCount}</strong>
          </article>
          <article className="admin-dashboard__card">
            <span>Notificaciones fallidas que requieren atención</span>
            <strong>{dashboard.failedNotificationCount}</strong>
          </article>
        </div>
      </section>

      <section aria-labelledby="catalog-summary-title">
        <h2 id="catalog-summary-title">Estado del catálogo</h2>
        <div className="admin-dashboard__cards">
          <article className="admin-dashboard__card">
            <span>Productos activos en categorías activas</span>
            <strong>{dashboard.activeProductCount}</strong>
          </article>
          <article className="admin-dashboard__card">
            <span>Productos activos agotados (stock 0)</span>
            <strong>{dashboard.unavailableProductCount}</strong>
          </article>
          <article className="admin-dashboard__card">
            <span>Productos activos con stock bajo (1–5)</span>
            <strong>{dashboard.lowStockProductCount}</strong>
          </article>
        </div>
      </section>

      <section aria-labelledby="recent-orders-title">
        <h2 id="recent-orders-title">Pedidos recientes</h2>
        {dashboard.recentOrders.length === 0 ? (
          <p>No hay pedidos todavía.</p>
        ) : (
          <div className="admin-dashboard__table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Pedido</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Entrega</th>
                  <th scope="col">Fecha solicitada</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentOrders.map((order) => (
                  <tr key={order.publicId}>
                    <th scope="row">{order.publicId}</th>
                    <td>{order.orderStatus}</td>
                    <td>
                      {order.fulfillment === 'DELIVERY' ? 'Envío' : 'Recogida'}
                    </td>
                    <td>{order.requestedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
