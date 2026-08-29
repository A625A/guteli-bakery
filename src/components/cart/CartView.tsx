'use client';

import Link from 'next/link';
import type { ChangeEvent } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { ProductArtwork } from '@/components/menu/ProductArtwork';
import { OrderRequest } from '@/components/order/OrderRequest';
import type { WhatsAppHandoff } from '@/config/public-site';
import { operationalCopy } from '@/content/business';
import { formatGTQ } from '@/lib/money';

export function CartView({ handoff }: { handoff: WhatsAppHandoff }) {
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
        <h1>Carrito</h1>
        <p>
          Ajusta cada cantidad antes de preparar tu solicitud. Puedes solicitar
          hasta 99 unidades por cada opción del menú.
        </p>
      </header>

      {!hydrated ? (
        <p className="request-page__loading" role="status">
          Cargando tu carrito…
        </p>
      ) : lines.length === 0 ? (
        <section className="request-empty" aria-labelledby="empty-cart-title">
          <p className="request-empty__number" aria-hidden="true">
            00
          </p>
          <div>
            <h2 id="empty-cart-title">Tu carrito está vacío</h2>
            <p>
              Elige productos y cantidades para iniciar una solicitud de pedido.
            </p>
            <Link className="button-link button-link--primary" href="/menu/">
              Explorar el menú
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="cart-layout">
            <section aria-labelledby="cart-lines-title">
              <h2 className="request-section-title" id="cart-lines-title">
                Productos seleccionados
              </h2>
              <ul className="cart-lines">
                {lines.map((line, lineIndex) => {
                  const inputId = `cart-quantity-${line.productId}`;

                  return (
                    <li
                      className="cart-line"
                      data-testid={`cart-line-${line.productId}`}
                      key={line.productId}
                    >
                      <ProductArtwork
                        product={line.product}
                        variant="cart"
                        eager={lineIndex < 2}
                      />
                      <div className="cart-line__identity">
                        <p>{line.product.category.name}</p>
                        <h3>{line.product.name}</h3>
                        <span>
                          {line.product.saleUnit ??
                            operationalCopy.quantityUnknown}
                        </span>
                      </div>
                      <div className="cart-line__quantity">
                        <label htmlFor={inputId}>
                          Cantidad de {line.product.name},{' '}
                          {line.product.category.name} en el carrito
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
                        Quitar {line.product.name} de{' '}
                        {line.product.category.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="cart-totals" aria-labelledby="cart-total-title">
              <p className="eyebrow">Estimación</p>
              <h2 id="cart-total-title">Resumen del carrito</h2>
              <p className="cart-totals__subtotal">
                Subtotal estimado: {formatGTQ(subtotal)}
              </p>
              <p>{operationalCopy.confirmation}.</p>
              <p>{operationalCopy.deliveryCost}.</p>
              <button className="cart-totals__payment" type="button" disabled>
                Pagar en línea — Próximamente
              </button>
              <a className="cart-totals__continue" href="#cart-checkout">
                Continuar con mi pedido
              </a>
            </aside>
          </div>
          <OrderRequest handoff={handoff} embedded />
        </>
      )}
    </main>
  );
}
