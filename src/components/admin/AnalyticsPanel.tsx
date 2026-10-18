'use client';
import { useEffect, useState } from 'react';
import { AdminDonut } from './AdminDonut';
const statusColors: Record<string, string> = {
  RECEIVED: '#d66245',
  CONFIRMED: '#d99332',
  PREPARING: '#efbf50',
  READY: '#47905a',
  OUT_FOR_DELIVERY: '#6a8d99',
  COMPLETED: '#99a475',
  CANCELLED: '#b16a63',
};
import type { AnalyticsDTO } from '@/server/admin/analytics';
import { orderStatusLabel } from '@/lib/order-status-label';
import type { OrderStatus } from '@/domain/order-state';
export function AnalyticsPanel({
  initialQuery = 'period=7',
}: {
  initialQuery?: string;
}) {
  const [from, setFrom] = useState(
    new URLSearchParams(initialQuery).get('from') ?? '',
  );
  const [to, setTo] = useState(
    new URLSearchParams(initialQuery).get('to') ?? '',
  );
  const [key, setKey] = useState(
    new URLSearchParams(initialQuery).get('period') ?? '7',
  );
  const [query, setQuery] = useState(initialQuery);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<AnalyticsDTO | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const back = () => {
      const p = new URLSearchParams(window.location.search);
      setKey(p.get('period') ?? '7');
      setFrom(p.get('from') ?? '');
      setTo(p.get('to') ?? '');
      setLoading(true);
      setError('');
      setData(null);
      setQuery(p.toString() || 'period=7');
      setAttempt((n) => n + 1);
    };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  useEffect(() => {
    if (!query) return;
    const abort = new AbortController();
    fetch('/api/admin/analytics?' + query, {
      signal: abort.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            'No se pudieron consultar las estadísticas. Revisa el rango de fechas o vuelve a iniciar sesión.',
          );
        return response.json() as Promise<AnalyticsDTO>;
      })
      .then((value) => {
        setData(value);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [query, attempt]);
  const max = Math.max(1, ...(data?.daily.map((d) => d.count) ?? []));
  // Group longer ranges into at most 15 consecutive buckets; the exact daily table remains available.
  const bucketSize = Math.max(1, Math.ceil((data?.daily.length ?? 0) / 15));
  const buckets = (data?.daily ?? []).reduce<
    { day: string; end: string; count: number }[]
  >((all, d, i) => {
    if (i % bucketSize === 0) all.push({ day: d.day, end: d.day, count: 0 });
    all[all.length - 1].count += d.count;
    all[all.length - 1].end = d.day;
    return all;
  }, []);
  const barMax = Math.max(max, ...buckets.map((b) => b.count));
  return (
    <section aria-labelledby="analytics-title">
      <div className="admin-panel-heading">
        <div>
          <h2 id="analytics-title">Así van tus pedidos</h2>
          <p>Pedidos y unidades solicitadas · Horario de Guatemala</p>
        </div>
      </div>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const p = new URLSearchParams({ period: String(form.get('period')) });
          if (key === 'custom') {
            p.set('from', String(form.get('from')));
            p.set('to', String(form.get('to')));
          }
          const next = p.toString();
          setLoading(true);
          setError('');
          setData(null);
          setQuery(next);
          setAttempt((n) => n + 1);
          window.history.pushState(null, '', '/admin?' + next);
        }}
      >
        <label>
          Período
          <select
            name="period"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          >
            <option value="today">Hoy</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="custom">Rango personalizado</option>
          </select>
        </label>
        {key === 'custom' ? (
          <>
            <label>
              Desde
              <input
                type="date"
                name="from"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                name="to"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <button type="submit">Consultar</button>
      </form>
      {loading ? (
        <p role="status" className="admin-empty">
          Consultando estadísticas…
        </p>
      ) : error ? (
        <p role="alert" className="admin-empty">
          {error}
        </p>
      ) : data ? (
        <>
          <div className="admin-mini-stats" style={{ margin: '16px 0' }}>
            <span>
              <strong>{data.received}</strong> pedidos recibidos
            </span>
            <span>
              {data.period.from} al {data.period.to}
              {data.period.partial ? ' · Hoy en curso' : ''}
            </span>
            <span>
              {data.previous === 0
                ? 'Sin base de comparación'
                : `${Math.round(((data.received - data.previous) / data.previous) * 100)}% frente al período anterior equivalente`}
            </span>
          </div>
          <div className="admin-stats-grid">
            <article className="admin-panel">
              <h2>Pedidos por período</h2>
              <p className="admin-chart-note">
                Incluye pedidos posteriormente cancelados.
              </p>
              {data.received === 0 ? (
                <div className="admin-empty">Sin pedidos en este período.</div>
              ) : (
                <div
                  className="admin-bars"
                  role="img"
                  aria-label={`Pedidos recibidos: ${data.received}. Consulta los valores en la tabla de datos.`}
                >
                  {buckets.map((b) => (
                    <div
                      className="admin-bar"
                      key={b.day}
                      title={`${b.day} — ${b.end}: ${b.count}`}
                    >
                      <b>{b.count}</b>
                      <i style={{ height: `${(b.count / barMax) * 140}px` }} />
                      <span>
                        {b.day.slice(8)}/{b.day.slice(5, 7)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <details>
                <summary>Ver datos por día</summary>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Pedidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.day}>
                        <th scope="row">{d.day}</th>
                        <td>{d.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </article>
            <article className="admin-panel">
              <h2>Pedidos por estado</h2>
              <p className="admin-chart-note">
                Estado actual de los pedidos recibidos en el período.
              </p>
              <div className="admin-donut-layout">
                <AdminDonut
                  values={data.statuses.map((s) => ({
                    count: s.count,
                    color: statusColors[s.status] ?? '#9d8c77',
                  }))}
                  label="pedidos"
                />
                <div className="admin-status-list">
                  {data.statuses.length ? (
                    data.statuses.map((s) => (
                      <div className="admin-panel-heading" key={s.status}>
                        <span className="admin-badge" data-state={s.status}>
                          <i
                            className="admin-legend-dot"
                            style={{
                              background: statusColors[s.status] ?? '#9d8c77',
                            }}
                          />
                          {orderStatusLabel(s.status as OrderStatus)}
                        </span>
                        <strong>{s.count}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty">
                      Todavía no hay estados que mostrar.
                    </p>
                  )}
                </div>
              </div>
            </article>
            <article className="admin-panel">
              <h2>Productos más solicitados</h2>
              <p className="admin-chart-note">
                Sin cancelados ni reembolsados. Cantidades según su
                presentación.
              </p>
              {data.products.length ? (
                <ol className="admin-rank">
                  {data.products.map((p, i) => (
                    <li key={`${p.id}-${i}`}>
                      <span>
                        {p.name}
                        <small> · {p.unit}</small>
                      </span>
                      <strong>{p.quantity}</strong>
                      <div className="admin-track" aria-hidden="true">
                        <span
                          style={{
                            width: `${(p.quantity / Math.max(...data.products.map((x) => x.quantity))) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="admin-empty">
                  Los productos aparecerán cuando recibas pedidos.
                </p>
              )}
            </article>
            <article className="admin-panel">
              <h2>Tipo de entrega</h2>
              <p className="admin-chart-note">
                Sobre {data.eligible} pedidos, sin cancelados ni reembolsados.
              </p>
              <AdminDonut
                values={data.delivery.map((d) => ({
                  count: d.count,
                  color: d.type === 'PICKUP' ? '#b36529' : '#edba81',
                }))}
                label="pedidos"
              />
              <ol className="admin-rank">
                {data.delivery.map((d) => (
                  <li key={d.type}>
                    <span>
                      {d.type === 'PICKUP'
                        ? 'Recogida en tienda'
                        : 'A domicilio'}
                    </span>
                    <strong>
                      {d.count} ({Math.round((d.count / data.eligible) * 100)}%)
                    </strong>
                    <div className="admin-track" aria-hidden="true">
                      <span
                        style={{ width: `${(d.count / data.eligible) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
              {!data.eligible ? (
                <p className="admin-empty">Sin entregas en este período.</p>
              ) : null}
            </article>
            <article className="admin-panel">
              <h2>Categorías más solicitadas</h2>
              <p className="admin-chart-note">
                Categoría histórica del pedido. Compara cantidades de la misma
                presentación.
              </p>
              {data.categories.length ? (
                <ol className="admin-rank">
                  {data.categories.map((c, i) => (
                    <li key={i}>
                      <span>
                        {c.name}
                        <small> · {c.unit}</small>
                      </span>
                      <strong>{c.quantity}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="admin-empty">
                  Sin categorías solicitadas en este período.
                </p>
              )}
            </article>
            <article className="admin-panel">
              <h2>Sobre estas estadísticas</h2>
              <p>Estas estadísticas muestran pedidos, no ventas cobradas.</p>
              <p className="admin-chart-note">
                Los nombres y categorías corresponden a los datos guardados en
                cada pedido. Un cambio de nombre puede aparecer como otra fila.
              </p>
              <p className="admin-chart-note">
                Usa Consultar para actualizar estos datos.
              </p>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}
