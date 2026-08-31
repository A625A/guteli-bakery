'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { operationalCopy, siteConfig } from '@/content/business';
import {
  buildCreateOrderRequest,
  validateOrder,
  type CheckoutState,
  type OrderErrors,
  type OrderFormValues,
} from '@/domain/order';
import { getMinimumOrderDate } from '@/lib/date';
import { submitOrder } from '@/lib/order-api';

const initialValues: OrderFormValues = {
  name: '',
  phone: '',
  fulfillment: 'pickup',
  requestedDate: '',
  location: '',
  notes: '',
};

const fieldLabels: Record<keyof OrderFormValues, string> = {
  name: 'Nombre completo',
  phone: 'Teléfono',
  fulfillment: 'Modalidad',
  requestedDate: 'Fecha solicitada',
  location: 'Ubicación o dirección',
  notes: 'Notas opcionales',
};

type OrderAttempt = Readonly<{
  idempotencyKey: string;
  serializedRequest: string;
}>;

export function OrderRequest({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { clearCart, hydrated, lines } = useCart();
  const [values, setValues] = useState<OrderFormValues>(initialValues);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    kind: 'EDITING',
  });
  const [errorFocusRequest, setErrorFocusRequest] = useState(0);
  const [minimumDate, setMinimumDate] = useState(() =>
    getMinimumOrderDate(new Date(), siteConfig.advanceDays),
  );
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const attemptRef = useRef<OrderAttempt | null>(null);
  const inFlightRef = useRef(false);
  const acceptedRef = useRef(false);
  const cartFingerprint = lines
    .map(({ productId, quantity }) => `${productId}:${quantity}`)
    .join('|');
  const previousCartFingerprintRef = useRef(cartFingerprint);

  useEffect(() => {
    if (errorFocusRequest > 0) errorSummaryRef.current?.focus();
  }, [errorFocusRequest]);

  const invalidateAttempt = useCallback(() => {
    attemptRef.current = null;
    setCheckoutState((currentState) =>
      currentState.kind === 'SUBMITTING' || currentState.kind === 'SUCCESS'
        ? currentState
        : { kind: 'EDITING' },
    );
  }, []);

  useEffect(() => {
    if (previousCartFingerprintRef.current === cartFingerprint) return;

    previousCartFingerprintRef.current = cartFingerprint;
    invalidateAttempt();
  }, [cartFingerprint, invalidateAttempt]);

  function setField<Key extends keyof OrderFormValues>(
    field: Key,
    value: OrderFormValues[Key],
  ) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    invalidateAttempt();
  }

  function changeFulfillment(fulfillment: OrderFormValues['fulfillment']) {
    const nextValues = { ...values, fulfillment };

    setValues(nextValues);
    invalidateAttempt();
    setErrors((currentErrors) =>
      Object.keys(currentErrors).length > 0
        ? validateOrder(nextValues, minimumDate)
        : currentErrors,
    );
  }

  async function sendOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || acceptedRef.current) return;

    const currentMinimumDate = getMinimumOrderDate(
      new Date(),
      siteConfig.advanceDays,
    );
    const nextErrors = validateOrder(values, currentMinimumDate);
    setMinimumDate(currentMinimumDate);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setCheckoutState({ kind: 'EDITING' });
      setErrorFocusRequest((currentRequest) => currentRequest + 1);
      return;
    }

    const request = buildCreateOrderRequest(values, lines);
    const serializedRequest = JSON.stringify(request);
    const existingAttempt = attemptRef.current;
    const idempotencyKey =
      existingAttempt?.serializedRequest === serializedRequest
        ? existingAttempt.idempotencyKey
        : crypto.randomUUID();

    attemptRef.current = { idempotencyKey, serializedRequest };
    inFlightRef.current = true;
    setErrors({});
    setCheckoutState({ kind: 'SUBMITTING', idempotencyKey });

    try {
      const result = await submitOrder(request, idempotencyKey);

      if (!result.ok) {
        if (!result.canRetryUnchanged) attemptRef.current = null;
        setCheckoutState({
          kind: 'ERROR',
          idempotencyKey,
          message: result.message,
        });
        return;
      }

      acceptedRef.current = true;
      setCheckoutState({
        kind: 'SUCCESS',
        publicId: result.order.publicId,
        receiptToken: result.order.receiptToken,
      });
      clearCart();
      router.push(
        `/order/confirmation/${encodeURIComponent(result.order.receiptToken)}/`,
      );
    } finally {
      inFlightRef.current = false;
    }
  }

  const submitting = checkoutState.kind === 'SUBMITTING';
  const PageContainer = embedded ? 'section' : 'main';

  return (
    <PageContainer
      id={embedded ? 'cart-checkout' : 'main-content'}
      className={embedded ? 'cart-checkout' : 'order-page'}
      tabIndex={embedded ? undefined : -1}
      aria-labelledby={embedded ? 'cart-checkout-title' : undefined}
    >
      <header className="request-page__intro">
        <p className="eyebrow">
          {embedded ? 'Datos y confirmación' : 'Solicitud sin pago en línea'}
        </p>
        {embedded ? (
          <h2 id="cart-checkout-title">Completa tu pedido</h2>
        ) : (
          <h1>Pedido</h1>
        )}
        <p>
          Completa tus datos y envía la solicitud. Güteli confirmará contigo los
          detalles del pedido antes de prepararlo.
        </p>
      </header>

      {!hydrated ? (
        <p className="request-page__loading" role="status">
          Cargando tu carrito…
        </p>
      ) : lines.length === 0 && checkoutState.kind !== 'SUCCESS' ? (
        <section className="request-empty" aria-labelledby="empty-order-title">
          <p className="request-empty__number" aria-hidden="true">
            00
          </p>
          <div>
            <h2 id="empty-order-title">Agrega productos antes de continuar</h2>
            <p>
              Tu solicitud necesita al menos una opción del menú para crear el
              pedido.
            </p>
            <Link className="button-link button-link--primary" href="/menu/">
              Ir al menú
            </Link>
          </div>
        </section>
      ) : (
        <div className="order-layout order-layout--submission">
          <form className="order-form" noValidate onSubmit={sendOrder}>
            {Object.keys(errors).length > 0 ? (
              <div
                className="order-errors"
                ref={errorSummaryRef}
                role="alert"
                tabIndex={-1}
              >
                <h2>Revisa los campos</h2>
                <p>Corrige lo indicado y vuelve a enviar tu pedido.</p>
                <ul>
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>
                      <a href={`#order-${field}`}>
                        {fieldLabels[field as keyof OrderFormValues]}: {error}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {checkoutState.kind === 'ERROR' ? (
              <div className="order-submit-error" role="alert">
                <h2>No se pudo enviar el pedido</h2>
                <p>{checkoutState.message}</p>
                <p>
                  Tu carrito y tus datos siguen aquí para que puedas reintentar.
                </p>
              </div>
            ) : null}

            <fieldset className="order-form__section" disabled={submitting}>
              <legend>Datos de contacto</legend>
              <div className="form-field">
                <label htmlFor="order-name">Nombre completo</label>
                <input
                  id="order-name"
                  name="name"
                  autoComplete="name"
                  required
                  value={values.name}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? 'order-name-error' : undefined
                  }
                  onChange={(event) => setField('name', event.target.value)}
                />
                {errors.name ? (
                  <p className="form-field__error" id="order-name-error">
                    {errors.name}
                  </p>
                ) : null}
              </div>
              <div className="form-field">
                <label htmlFor="order-phone">Teléfono</label>
                <input
                  id="order-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  value={values.phone}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={
                    errors.phone ? 'order-phone-error' : undefined
                  }
                  onChange={(event) => setField('phone', event.target.value)}
                />
                {errors.phone ? (
                  <p className="form-field__error" id="order-phone-error">
                    {errors.phone}
                  </p>
                ) : null}
              </div>
            </fieldset>

            <fieldset className="order-form__section" disabled={submitting}>
              <legend>Entrega del pedido</legend>
              <div className="fulfillment-options">
                <label data-selected={values.fulfillment === 'pickup'}>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="pickup"
                    required
                    checked={values.fulfillment === 'pickup'}
                    onChange={() => changeFulfillment('pickup')}
                  />
                  <span>Recogida</span>
                </label>
                <label data-selected={values.fulfillment === 'delivery'}>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="delivery"
                    required
                    checked={values.fulfillment === 'delivery'}
                    onChange={() => changeFulfillment('delivery')}
                  />
                  <span>Envío</span>
                </label>
              </div>
              <p className="fulfillment-guidance">
                {values.fulfillment === 'pickup'
                  ? operationalCopy.pickupInformation
                  : operationalCopy.deliveryCost}
              </p>
              {values.fulfillment === 'delivery' ? (
                <div className="form-field">
                  <label htmlFor="order-location">Ubicación o dirección</label>
                  <textarea
                    id="order-location"
                    name="location"
                    rows={3}
                    autoComplete="street-address"
                    required
                    value={values.location}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={
                      errors.location ? 'order-location-error' : undefined
                    }
                    onChange={(event) =>
                      setField('location', event.target.value)
                    }
                  />
                  {errors.location ? (
                    <p className="form-field__error" id="order-location-error">
                      {errors.location}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="form-field">
                <label htmlFor="order-requestedDate">Fecha solicitada</label>
                <input
                  id="order-requestedDate"
                  name="requestedDate"
                  type="date"
                  min={minimumDate}
                  required
                  value={values.requestedDate}
                  aria-invalid={Boolean(errors.requestedDate)}
                  aria-describedby={
                    errors.requestedDate
                      ? 'order-requestedDate-error'
                      : 'order-date-help'
                  }
                  onChange={(event) =>
                    setField('requestedDate', event.target.value)
                  }
                />
                <p className="form-field__help" id="order-date-help">
                  Disponible a partir del {minimumDate}.
                </p>
                {errors.requestedDate ? (
                  <p
                    className="form-field__error"
                    id="order-requestedDate-error"
                  >
                    {errors.requestedDate}
                  </p>
                ) : null}
              </div>
              <div className="form-field">
                <label htmlFor="order-notes">Notas opcionales</label>
                <textarea
                  id="order-notes"
                  name="notes"
                  rows={4}
                  value={values.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                />
              </div>
            </fieldset>

            <p className="order-privacy">
              Tu nombre, teléfono, ubicación de entrega y notas se usan para
              procesar, contactarte y coordinar el pedido. Cuando esté
              configurado, Güteli podrá incluir estos datos en una notificación
              por WhatsApp a la persona dueña para preparar y entregar tu
              pedido.
            </p>

            <button
              className="order-form__submit"
              type="submit"
              disabled={submitting || checkoutState.kind === 'SUCCESS'}
            >
              {submitting
                ? 'Enviando pedido…'
                : checkoutState.kind === 'ERROR'
                  ? 'Intentar de nuevo'
                  : 'Enviar pedido'}
            </button>
          </form>
        </div>
      )}
    </PageContainer>
  );
}
