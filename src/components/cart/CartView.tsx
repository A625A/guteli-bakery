'use client';

import Link from 'next/link';
import type { ChangeEvent } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { BasketIcon } from '@/components/shared/BasketIcon';
import { operationalCopy } from '@/content/business';
import { formatGTQ } from '@/lib/money';

export function CartView() {
  const { hydrated, lines, subtotal, removeItem, updateQuantity } = useCart();

  function changeQuantity(
    productId: (typeof lines)[number]['productId'],
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const quantity = event.currentTarget.valueAsNumber;

    if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 99) {
      updateQuantity(productId, quantity);
    }
  }

  return (
    <main id="main-content" className="cart-page" tabIndex={-1}>
      <header className="request-page__intro">
        <p className="eyebrow">Revisa tu selección</p>
        <h1>Tu canasta</h1>
        <p>
          Ajusta cada cantidad antes de preparar tu solicitud. Puedes solicitar
          hasta 99 unidades por cada opción del menú.
        </p>
      </header>

      {!hydrated ? (
        <p className="request-page__loading" role="status">
          Cargando tu canasta…
        </p>
      ) : lines.length === 0 ? (
        <section className="request-empty" aria-labelledby="empty-cart-title">
          <BasketIcon className="basket-icon request-empty__basket" />
          <div>
            <h2 id="empty-cart-title">
              Tu canasta espera algo recién horneado
            </h2>
            <p>Explora el menú y elige lo que te gustaría compartir.</p>
            <Link className="button-link button-link--primary" href="/menu/">
              Explorar el menú
            </Link>
          </div>
        </section>
      ) : (
        <div className="cart-layout">
          <section aria-labelledby="cart-lines-title">
            <h2 className="request-section-title" id="cart-lines-title">
              Productos seleccionados
            </h2>
            <ul className="cart-lines">
              {lines.map((line) => {
                const inputId = `cart-quantity-${line.productId}`;

                return (
                  <li
                    className="cart-line"
                    data-testid={`cart-line-${line.productId}`}
                    key={line.productId}
                  >
                    <div className="cart-line__identity">
                      <p>{line.product.categoryLabel}</p>
                      <h3>{line.product.name}</h3>
                      <span>
                        {line.product.saleUnit ??
                          operationalCopy.quantityUnknown}
                      </span>
                    </div>
                    <div className="cart-line__quantity">
                      <label htmlFor={inputId}>
                        Cantidad de {line.product.name},{' '}
                        {line.product.categoryLabel} en la canasta
                      </label>
                      <input
                        id={inputId}
                        type="number"
                        min="1"
                        max="99"
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(event) =>
                          changeQuantity(line.productId, event)
                        }
                      />
                    </div>
                    <p className="cart-line__total">
                      <span>Total de línea</span>
                      <strong>{formatGTQ(line.lineTotal)}</strong>
                    </p>
                    <button
                      className="cart-line__remove"
                      type="button"
                      onClick={() => removeItem(line.productId)}
                    >
                      Quitar {line.product.name} de {line.product.categoryLabel}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className="cart-totals" aria-labelledby="cart-total-title">
            <p className="eyebrow">Estimación</p>
            <h2 id="cart-total-title">Tu selección</h2>
            <p className="cart-totals__subtotal">
              Subtotal estimado: {formatGTQ(subtotal)}
            </p>
            <p>{operationalCopy.confirmation}.</p>
            <p>{operationalCopy.deliveryCost}.</p>
            <Link className="button-link button-link--primary" href="/order/">
              Completar mi solicitud
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
