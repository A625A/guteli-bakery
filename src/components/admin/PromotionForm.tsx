'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Promotion } from '@/domain/pricing';
import { toGuatemalaLocal } from '@/lib/promotion-time';

export function PromotionForm({
  promotion,
  products,
}: {
  promotion?: Promotion;
  products: readonly { id: string; name: string; categoryName: string }[];
}) {
  const router = useRouter();
  const [scope, setScope] = useState(promotion?.scope ?? 'SELECTED');
  const [version, setVersion] = useState(promotion?.version ?? 1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
            productIds: scope === 'SELECTED' ? data.getAll('productIds') : [],
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
        throw new Error(
          result.error?.message ?? 'No se pudo guardar la promoción.',
        );
      setVersion(result.promotion.version);
      setMessage(
        'Promoción guardada. Los precios se actualizan automáticamente.',
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la promoción.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="admin-auth-card">
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
              <legend>Selecciona uno o varios productos</legend>
              {products.map((product) => (
                <label key={product.id}>
                  <input
                    name="productIds"
                    type="checkbox"
                    value={product.id}
                    defaultChecked={
                      promotion?.productIds.includes(product.id) ?? false
                    }
                  />
                  {product.categoryName}: {product.name}
                </label>
              ))}
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
