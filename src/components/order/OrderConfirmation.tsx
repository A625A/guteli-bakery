import Link from 'next/link';

import { formatGTQ } from '@/lib/money';
import type { PublicReceipt } from '@/server/orders/get-receipt';

const orderStatusLabels: Readonly<Record<string, string>> = {
  RECEIVED: 'Pedido recibido',
  CONFIRMED: 'Pedido confirmado',
  PREPARING: 'En preparación',
  READY: 'Listo para entregar',
  OUT_FOR_DELIVERY: 'En camino',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const paymentStatusLabels: Readonly<Record<string, string>> = {
  UNPAID: 'Pago pendiente',
  PENDING: 'Pago en proceso',
  PAID: 'Pagado',
  FAILED: 'Pago no completado',
  REFUNDED: 'Pago reembolsado',
};

function formatRequestedDate(requestedDate: string) {
  return new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'long',
    timeZone: 'America/Guatemala',
  }).format(new Date(`${requestedDate}T12:00:00-06:00`));
}

export function OrderConfirmation({ receipt }: { receipt: PublicReceipt }) {
  const fulfillmentLabel =
    receipt.fulfillment === 'pickup' ? 'Recogida' : 'Envío';

  return (
    <main id="main-content" className="order-confirmation" tabIndex={-1}>
      <header className="order-confirmation__hero">
        <p className="eyebrow">Confirmación segura</p>
        <h1>¡Pedido recibido!</h1>
        <p>
          Guarda este enlace privado para consultar el estado. Güteli se
          comunicará contigo para confirmar los detalles.
        </p>
        <p className="order-confirmation__public-id">{receipt.publicId}</p>
      </header>

      <section
        className="order-confirmation__status"
        aria-labelledby="order-status-title"
      >
        <h2 id="order-status-title">Estado del pedido</h2>
        <dl>
          <div>
            <dt>Pedido</dt>
            <dd>
              {orderStatusLabels[receipt.orderStatus] ?? 'Estado por confirmar'}
            </dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd>
              {paymentStatusLabels[receipt.paymentStatus] ??
                'Estado por confirmar'}
            </dd>
          </div>
          <div>
            <dt>Modalidad</dt>
            <dd>{fulfillmentLabel}</dd>
          </div>
          <div>
            <dt>Fecha solicitada</dt>
            <dd>{formatRequestedDate(receipt.requestedDate)}</dd>
          </div>
        </dl>
      </section>

      <section
        className="order-confirmation__items"
        aria-labelledby="order-items-title"
      >
        <h2 id="order-items-title">Productos solicitados</h2>
        <ul>
          {receipt.items.map((item, index) => (
            <li key={`${item.productName}-${item.categoryLabel}-${index}`}>
              <div>
                <p>{item.categoryLabel}</p>
                <h3>{item.productName}</h3>
                {item.saleUnit ? <span>{item.saleUnit}</span> : null}
              </div>
              <p>
                {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} ×{' '}
                {formatGTQ(item.unitPriceMinor)}
              </p>
              <strong>{formatGTQ(item.lineTotalMinor)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="order-confirmation__totals"
        aria-labelledby="order-totals-title"
      >
        <h2 id="order-totals-title">Totales del pedido</h2>
        <p>Subtotal: {formatGTQ(receipt.subtotalMinor)}</p>
        {receipt.fulfillment === 'pickup' ? (
          <p className="order-confirmation__total">
            Total: {formatGTQ(receipt.totalMinor ?? receipt.subtotalMinor)}
          </p>
        ) : receipt.shippingMinor === null || receipt.totalMinor === null ? (
          <div className="order-confirmation__pending">
            <p>Costo de envío por confirmar</p>
            <p>Total por confirmar</p>
            <span>
              Güteli te confirmará el costo según la ubicación de entrega.
            </span>
          </div>
        ) : (
          <>
            <p>Envío: {formatGTQ(receipt.shippingMinor)}</p>
            <p className="order-confirmation__total">
              Total: {formatGTQ(receipt.totalMinor)}
            </p>
          </>
        )}
      </section>

      <nav
        className="order-confirmation__actions"
        aria-label="Después de confirmar el pedido"
      >
        <Link className="button-link button-link--primary" href="/menu/">
          Volver al menú
        </Link>
        <Link className="button-link button-link--secondary" href="/contact/">
          Contactar a Güteli
        </Link>
      </nav>
    </main>
  );
}

export function OrderConfirmationNotFound() {
  return (
    <main id="main-content" className="order-confirmation" tabIndex={-1}>
      <section className="order-confirmation__missing">
        <p className="eyebrow">Consulta privada</p>
        <h1>No encontramos este pedido</h1>
        <p>
          Revisa que el enlace esté completo o vuelve al menú para continuar.
        </p>
        <Link className="button-link button-link--primary" href="/menu/">
          Volver al menú
        </Link>
      </section>
    </main>
  );
}
