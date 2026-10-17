'use client';
import { useState } from 'react';
import type { Promotion } from '@/domain/pricing';
import { AdminDrawer } from './AdminDrawer';
import { PromotionForm } from './PromotionForm';
export function PromotionsTable({
  promotions,
  products,
  now,
}: {
  promotions: Promotion[];
  products: { id: string; name: string; categoryName: string }[];
  now: string;
}) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const status = (p: Promotion) =>
    !p.enabled
      ? 'Desactivada'
      : p.endsAt <= now
        ? 'Finalizada'
        : p.startsAt > now
          ? 'Programada'
          : 'Activa';
  const shown = promotions.filter(
    (p) =>
      p.name
        .toLocaleLowerCase('es-GT')
        .includes(search.toLocaleLowerCase('es-GT')) &&
      (state === 'all' || status(p) === state),
  );
  const date = (s: string) =>
    new Intl.DateTimeFormat('es-GT', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Guatemala',
    })
      .format(new Date(s))
      .replace(/\s+/g, ' ');
  return (
    <>
      <header className="admin-dashboard__heading">
        <div>
          <h1>Promociones</h1>
          <p>Ofertas claras, en el momento indicado.</p>
        </div>
        <AdminDrawer title="Agregar promoción" trigger="Agregar promoción">
          <PromotionForm products={products} />
        </AdminDrawer>
      </header>
      <div className="admin-toolbar">
        <label>
          Buscar promociones
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre de la promoción…"
          />
        </label>
        <label>
          Estado
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">Todos los estados</option>
            {['Activa', 'Programada', 'Finalizada', 'Desactivada'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-dashboard__table-wrap admin-responsive-table">
        <table>
          <thead>
            <tr>
              {[
                'Promoción',
                'Descuento',
                'Productos',
                'Vigencia (Guatemala)',
                'Estado',
                'Acciones',
              ].map((t) => (
                <th key={t} scope="col">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <th scope="row">{p.name}</th>
                <td data-label="Descuento">{p.discountBps / 100}%</td>
                <td data-label="Productos">
                  {p.scope === 'CATALOG'
                    ? 'Todo el catálogo'
                    : `${p.productIds.length} seleccionados`}
                </td>
                <td data-label="Vigencia">
                  {date(p.startsAt)}
                  <br />
                  {date(p.endsAt)}
                </td>
                <td data-label="Estado">
                  <span
                    className="admin-badge"
                    data-state={status(p) === 'Activa' ? 'active' : 'inactive'}
                  >
                    {status(p)}
                  </span>
                </td>
                <td>
                  <AdminDrawer
                    title={'Editar ' + p.name}
                    trigger={'Editar ' + p.name}
                  >
                    <PromotionForm promotion={p} products={products} />
                  </AdminDrawer>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length ? (
          <p className="admin-empty">
            No hay promociones que mostrar. Agrega una oferta para tu catálogo.
          </p>
        ) : null}
      </div>
      <p className="admin-chart-note">
        Si coinciden varias promociones, se aplica solo el mayor descuento. Las
        ofertas terminan a la hora indicada.
      </p>
    </>
  );
}
