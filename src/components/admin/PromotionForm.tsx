'use client';
import { OwnerUiError, ownerErrorMessage } from '@/lib/owner-ui-error';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Promotion } from '@/domain/pricing';
import { toGuatemalaLocal } from '@/lib/promotion-time';

export function PromotionForm({
  promotion: initialPromotion,
  products,
}: {
  promotion?: Promotion;
  products: readonly { id: string; name: string; categoryName: string }[];
}) {
  const router = useRouter();
  const [promotion, setPromotion] = useState(initialPromotion);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<readonly string[]>(
    initialPromotion?.productIds ?? [],
  );
  const visible = products.filter(
    (p) =>
      (!category || p.categoryName === category) &&
      p.name
        .toLocaleLowerCase('es-GT')
        .includes(search.toLocaleLowerCase('es-GT')),
  );

  const [scope, setScope] = useState(promotion?.scope ?? 'SELECTED');
  const [version, setVersion] = useState(promotion?.version ?? 1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(
        promotion
          ? `/api/admin/promotions/${promotion.id}`
          : '/api/admin/promotions',
        {
          method: promotion ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: data.get('name'),
            scope,
            productIds: scope === 'SELECTED' ? selected : [],
            discountPercent: Number(data.get('discountPercent')),
            startsAtLocal: data.get('startsAtLocal'),
            endsAtLocal: data.get('endsAtLocal'),
            enabled: data.has('enabled'),
            ...(promotion ? { expectedVersion: version } : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.promotion)
        throw new OwnerUiError(
          result.error?.message ?? 'No se pudo guardar la promoción.',
        );
      setVersion(result.promotion.version);
      setPromotion(result.promotion);
      form.dispatchEvent(new Event('admin:saved', { bubbles: true }));
      setMessage(
        'Promoción guardada. Los precios se actualizan automáticamente.',
      );
      router.refresh();
    } catch (error) {
      setMessage(ownerErrorMessage(error, 'No se pudo guardar la promoción.'));
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="admin-auth-card" aria-busy={pending}>
      <h2>{promotion ? promotion.name : 'Nueva promoción'}</h2>
      <form
        aria-label={promotion ? `Editar ${promotion.name}` : 'Nueva promoción'}
        onSubmit={save}
      >
        <fieldset disabled={pending}>
          <legend>Precios y vigencia</legend>
          <label>
            Nombre de la promoción
            <input
              name="name"
              defaultValue={promotion?.name ?? ''}
              required
              maxLength={120}
            />
          </label>
          <label>
            Descuento (%)
            <input
              name="discountPercent"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              defaultValue={promotion ? promotion.discountBps / 100 : ''}
              required
            />
          </label>
          <label>
            Inicio (hora de Guatemala)
            <input
              name="startsAtLocal"
              type="datetime-local"
              defaultValue={
                promotion ? toGuatemalaLocal(new Date(promotion.startsAt)) : ''
              }
              required
            />
          </label>
          <label>
            Fin (hora de Guatemala)
            <input
              name="endsAtLocal"
              type="datetime-local"
              defaultValue={
                promotion ? toGuatemalaLocal(new Date(promotion.endsAt)) : ''
              }
              required
            />
          </label>
          <label>
            Alcance
            <select
              value={scope}
              onChange={(event) =>
                setScope(event.target.value as Promotion['scope'])
              }
            >
              <option value="SELECTED">Productos seleccionados</option>
              <option value="CATALOG">Todo el catálogo</option>
            </select>
          </label>
          {scope === 'SELECTED' ? (
            <fieldset>
              <legend>Productos de la promoción</legend>
              <label>
                Buscar productos para la promoción
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                Filtrar por categoría
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {[...new Set(products.map((p) => p.categoryName))].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
              <p aria-live="polite">
                {selected.length} productos seleccionados
              </p>
              <div className="admin-toolbar">
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={(e) => {
                    setSelected([
                      ...new Set([...selected, ...visible.map((p) => p.id)]),
                    ]);
                    e.currentTarget.dispatchEvent(
                      new Event('admin:dirty', { bubbles: true }),
                    );
                  }}
                >
                  Seleccionar visibles ({visible.length})
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  onClick={(e) => {
                    setSelected([]);
                    e.currentTarget.dispatchEvent(
                      new Event('admin:dirty', { bubbles: true }),
                    );
                  }}
                >
                  Quitar selección
                </button>
              </div>
              {selected.some((id) => !products.some((p) => p.id === id)) ? (
                <p role="status">
                  Hay productos retirados en esta selección.{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      setSelected(
                        selected.filter((id) =>
                          products.some((p) => p.id === id),
                        ),
                      );
                      e.currentTarget.dispatchEvent(
                        new Event('admin:dirty', { bubbles: true }),
                      );
                    }}
                  >
                    Quitar productos retirados (
                    {
                      selected.filter(
                        (id) => !products.some((p) => p.id === id),
                      ).length
                    }
                    )
                  </button>
                </p>
              ) : null}
              <div className="admin-product-choices">
                {[...new Set(visible.map((p) => p.categoryName))].map((c) => (
                  <div key={c}>
                    <h3>{c}</h3>
                    {visible
                      .filter((p) => p.categoryName === c)
                      .map((p) => (
                        <label key={p.id}>
                          <input
                            type="checkbox"
                            checked={selected.includes(p.id)}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, p.id]
                                  : selected.filter((id) => id !== p.id),
                              )
                            }
                          />
                          {p.name}
                        </label>
                      ))}
                  </div>
                ))}
              </div>
              {!visible.length ? <p>No hay productos que coincidan.</p> : null}
            </fieldset>
          ) : (
            <p>Aplica a todos los productos del catálogo.</p>
          )}
          <label>
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={promotion?.enabled ?? true}
            />
            Promoción habilitada
          </label>
          <button disabled={pending} type="submit">
            Guardar promoción
          </button>
        </fieldset>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
