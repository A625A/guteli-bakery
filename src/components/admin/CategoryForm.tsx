'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { AdminCategoryDto } from '@/server/products/admin-categories';

type MutationPayload = Readonly<{
  category?: AdminCategoryDto;
  error?: { message?: string };
}>;

export function CategoryForm({ category }: { category?: AdminCategoryDto }) {
  const router = useRouter();
  const [version, setVersion] = useState(category?.version ?? 1);
  const [active, setActive] = useState(category?.active ?? true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const prefix = category ? `category-${category.id}` : 'category-new';

  async function save(formData: FormData) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(
        category
          ? `/api/admin/categories/${category.id}`
          : '/api/admin/categories',
        {
          method: category ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: String(formData.get('name') ?? ''),
            slug: String(formData.get('slug') ?? ''),
            active,
            sortOrder: Number(formData.get('sortOrder')),
            ...(category
              ? {
                  expectedVersion: version,
                  ...(category.active && !active
                    ? { confirmAffectedProducts: true }
                    : {}),
                }
              : {}),
          }),
        },
      );
      const payload = (await response.json()) as MutationPayload;
      if (!response.ok || !payload.category) {
        throw new Error(
          payload.error?.message ?? 'No se pudo guardar la categoría.',
        );
      }
      setVersion(payload.category.version);
      setActive(payload.category.active);
      setMessage(category ? 'Categoría actualizada.' : 'Categoría creada.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la categoría.',
      );
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/categories/${category!.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedVersion: version,
          confirmAffectedProducts: true,
        }),
      });
      const payload = (await response.json()) as MutationPayload;
      if (!response.ok || !payload.category) {
        throw new Error(
          payload.error?.message ?? 'No se pudo desactivar la categoría.',
        );
      }
      setVersion(payload.category.version);
      setActive(false);
      setMessage('Categoría desactivada.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo desactivar la categoría.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-auth-card">
      <form action={save}>
        <label htmlFor={`${prefix}-name`}>Nombre</label>
        <input
          id={`${prefix}-name`}
          name="name"
          aria-label={
            category ? `Nombre de ${category.name}` : 'Nombre de categoría'
          }
          defaultValue={category?.name}
          maxLength={160}
          required
        />
        <label htmlFor={`${prefix}-slug`}>Slug</label>
        <input
          id={`${prefix}-slug`}
          name="slug"
          aria-label={
            category ? `Slug de ${category.name}` : 'Slug de categoría'
          }
          defaultValue={category?.slug}
          maxLength={120}
          required
        />
        <label htmlFor={`${prefix}-sort`}>Orden</label>
        <input
          id={`${prefix}-sort`}
          name="sortOrder"
          aria-label={
            category ? `Orden de ${category.name}` : 'Orden de categoría'
          }
          type="number"
          min="0"
          step="1"
          defaultValue={category?.sortOrder ?? 0}
          required
        />
        <label>
          <input
            name="active"
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />{' '}
          Activa
        </label>
        <button type="submit" disabled={pending}>
          {category ? `Guardar ${category.name}` : 'Crear categoría'}
        </button>
      </form>
      {category?.active ? (
        <div>
          <p>
            Desactivar ocultará {category.productCount}{' '}
            {category.productCount === 1
              ? 'producto activo'
              : 'productos activos'}
            .
          </p>
          <button type="button" onClick={deactivate} disabled={pending}>
            Desactivar {category.name}
          </button>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
