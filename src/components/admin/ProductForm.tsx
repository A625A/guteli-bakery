'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { AdminProductDto } from '@/server/products/admin-products';

type CategoryOption = Readonly<{
  id: string;
  name: string;
  active: boolean;
}>;

type MutationPayload = Readonly<{
  product?: AdminProductDto;
  error?: { message?: string };
}>;

export function ProductForm({
  categories,
  product,
}: Readonly<{
  categories: readonly CategoryOption[];
  product?: AdminProductDto;
}>) {
  const router = useRouter();
  const [version, setVersion] = useState(product?.version ?? 1);
  const [active, setActive] = useState(product?.active ?? true);
  const [deleted, setDeleted] = useState(
    product?.deletedAt !== null && !!product,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const available =
    !!product &&
    active &&
    !deleted &&
    (product.stockQuantity === null || product.stockQuantity > 0);

  function mutationBody(formData: FormData, nextActive = active) {
    const saleUnit = String(formData.get('saleUnit') ?? '').trim();
    const sku = String(formData.get('sku') ?? '').trim();
    const stock = String(formData.get('stockQuantity') ?? '').trim();
    return {
      categoryId: String(formData.get('categoryId') ?? ''),
      name: String(formData.get('name') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      description: String(formData.get('description') ?? ''),
      saleUnit: saleUnit || null,
      sku: sku || null,
      priceMinor: Number(formData.get('priceMinor')),
      stockQuantity: stock === '' ? null : Number(stock),
      active: nextActive,
      featured: formData.get('featured') === 'on',
      sortOrder: Number(formData.get('sortOrder')),
      ...(product ? { expectedVersion: version } : {}),
    };
  }

  async function save(formData: FormData) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(
        product ? `/api/admin/products/${product.id}` : '/api/admin/products',
        {
          method: product ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(mutationBody(formData)),
        },
      );
      const payload = (await response.json()) as MutationPayload;
      if (!response.ok || !payload.product) {
        throw new Error(
          payload.error?.message ?? 'No se pudo guardar el producto.',
        );
      }
      setVersion(payload.product.version);
      setActive(payload.product.active);
      setDeleted(payload.product.deletedAt !== null);
      setMessage(product ? 'Producto actualizado.' : 'Producto creado.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el producto.',
      );
    } finally {
      setPending(false);
    }
  }

  async function deactivate(formData: FormData) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/products/${product!.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mutationBody(formData, false)),
      });
      const payload = (await response.json()) as MutationPayload;
      if (!response.ok || !payload.product) {
        throw new Error(
          payload.error?.message ?? 'No se pudo desactivar el producto.',
        );
      }
      setVersion(payload.product.version);
      setActive(false);
      setMessage('Producto desactivado.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo desactivar el producto.',
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/products/${product!.id}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedVersion: version }),
      });
      const payload = (await response.json()) as MutationPayload;
      if (!response.ok || !payload.product) {
        throw new Error(
          payload.error?.message ?? 'No se pudo retirar el producto.',
        );
      }
      setVersion(payload.product.version);
      setActive(false);
      setDeleted(true);
      setMessage('Producto retirado sin borrar su historial.');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo retirar el producto.',
      );
    } finally {
      setPending(false);
    }
  }

  async function duplicate(formData: FormData) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/products/${product!.id}/duplicate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: String(formData.get('duplicateName') ?? ''),
            slug: String(formData.get('duplicateSlug') ?? ''),
            expectedVersion: version,
          }),
        },
      );
      const payload = (await response.json()) as MutationPayload;
      if (!response.ok || !payload.product) {
        throw new Error(
          payload.error?.message ?? 'No se pudo duplicar el producto.',
        );
      }
      setMessage('Copia inactiva creada.');
      router.push(`/admin/products/${payload.product.id}`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo duplicar el producto.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="admin-auth-card"
      aria-label={product ? 'Editar producto' : 'Crear producto'}
    >
      <form action={save}>
        <label htmlFor="product-name">Nombre</label>
        <input
          id="product-name"
          name="name"
          aria-label="Nombre del producto"
          defaultValue={product?.name}
          maxLength={160}
          required
        />
        <label htmlFor="product-slug">Slug</label>
        <input
          id="product-slug"
          name="slug"
          aria-label="Slug del producto"
          defaultValue={product?.slug}
          maxLength={120}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          required
        />
        <label htmlFor="product-category">Categoría</label>
        <select
          id="product-category"
          name="categoryId"
          defaultValue={product?.categoryId}
          required
        >
          {categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
              disabled={!category.active}
            >
              {category.name}
              {category.active ? '' : ' (inactiva)'}
            </option>
          ))}
        </select>
        <label htmlFor="product-description">Descripción</label>
        <textarea
          id="product-description"
          name="description"
          defaultValue={product?.description}
          maxLength={4_000}
        />
        <label htmlFor="product-sale-unit">Unidad de venta</label>
        <input
          id="product-sale-unit"
          name="saleUnit"
          defaultValue={product?.saleUnit ?? ''}
          maxLength={80}
        />
        <label htmlFor="product-sku">SKU</label>
        <input
          id="product-sku"
          name="sku"
          defaultValue={product?.sku ?? ''}
          maxLength={80}
        />
        <label htmlFor="product-price">Precio en centavos</label>
        <input
          id="product-price"
          name="priceMinor"
          type="number"
          min="0"
          step="1"
          defaultValue={product?.priceMinor ?? 0}
          required
        />
        <label htmlFor="product-stock">Existencia</label>
        <input
          id="product-stock"
          name="stockQuantity"
          type="number"
          min="0"
          step="1"
          defaultValue={product?.stockQuantity ?? ''}
          placeholder="Sin control"
        />
        <label htmlFor="product-sort">Orden</label>
        <input
          id="product-sort"
          name="sortOrder"
          aria-label="Orden del producto"
          type="number"
          min="0"
          step="1"
          defaultValue={product?.sortOrder ?? 0}
          required
        />
        <label>
          <input
            name="featured"
            type="checkbox"
            defaultChecked={product?.featured ?? false}
          />{' '}
          Destacado
        </label>
        <label>
          <input
            name="active"
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            disabled={deleted}
          />{' '}
          Activo
        </label>
        <button
          type="submit"
          disabled={pending || categories.length === 0 || deleted}
        >
          {product ? 'Guardar producto' : 'Crear producto'}
        </button>
        {product && active && !deleted ? (
          <>
            <p>
              {available
                ? 'Este producto está disponible; desactivarlo lo ocultará del menú.'
                : 'Este producto está agotado; desactivarlo lo ocultará del menú.'}
            </p>
            <button type="submit" formAction={deactivate} disabled={pending}>
              Desactivar producto
            </button>
          </>
        ) : null}
      </form>
      {product && !deleted ? (
        <>
          <form action={duplicate}>
            <h2>Duplicar producto</h2>
            <label htmlFor="duplicate-name">Nombre de la copia</label>
            <input
              id="duplicate-name"
              name="duplicateName"
              required
              maxLength={160}
            />
            <label htmlFor="duplicate-slug">Slug de la copia</label>
            <input
              id="duplicate-slug"
              name="duplicateSlug"
              required
              maxLength={120}
            />
            <button type="submit" disabled={pending}>
              Crear copia inactiva
            </button>
          </form>
          <div>
            <p>
              Retirar conserva pedidos históricos y elimina el producto del
              catálogo público.
            </p>
            <button type="button" onClick={remove} disabled={pending}>
              Retirar producto
            </button>
          </div>
        </>
      ) : null}
      {product?.images.length ? (
        <section aria-labelledby="current-images-title">
          <h2 id="current-images-title">Imágenes actuales</h2>
          <ul>
            {product.images.map((image) => (
              <li key={image.id}>{image.storageKey}</li>
            ))}
          </ul>
          <p>La carga y eliminación de imágenes se habilitará por separado.</p>
        </section>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
