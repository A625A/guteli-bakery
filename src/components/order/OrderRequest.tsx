'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import type { WhatsAppHandoff } from '@/config/public-site';
import { operationalCopy, siteConfig } from '@/content/business';
import {
  validateOrder,
  type OrderErrors,
  type OrderFormValues,
} from '@/domain/order';
import { getMinimumOrderDate } from '@/lib/date';
import { buildOrderSummary } from '@/lib/order-summary';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

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

export function OrderRequest({
  handoff,
  embedded = false,
}: {
  handoff: WhatsAppHandoff;
  embedded?: boolean;
}) {
  const { hydrated, lines } = useCart();
  const [values, setValues] = useState<OrderFormValues>(initialValues);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [errorFocusRequest, setErrorFocusRequest] = useState(0);
  const [minimumDate, setMinimumDate] = useState(() =>
    getMinimumOrderDate(new Date(), siteConfig.advanceDays),
  );
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorFocusRequest > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [errorFocusRequest]);

  function setField<Key extends keyof OrderFormValues>(
    field: Key,
    value: OrderFormValues[Key],
  ) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setSummary(null);
    setCopyStatus('');
  }

  function reviewRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentMinimumDate = getMinimumOrderDate(
      new Date(),
      siteConfig.advanceDays,
    );
    const nextErrors = validateOrder(values, currentMinimumDate);

    setMinimumDate(currentMinimumDate);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setErrorFocusRequest((currentRequest) => currentRequest + 1);
      return;
    }

    setErrors({});
    setCopyStatus('');
    setSummary(buildOrderSummary(lines, values));
  }

  function changeFulfillment(fulfillment: OrderFormValues['fulfillment']) {
    const nextValues = { ...values, fulfillment };

    setValues(nextValues);
    setSummary(null);
    setCopyStatus('');
    setErrors((currentErrors) =>
      Object.keys(currentErrors).length > 0
        ? validateOrder(nextValues, minimumDate)
        : currentErrors,
    );
  }

  async function copySummary() {
    if (!summary) {
      return;
    }

    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('Resumen copiado.');
    } catch {
      setCopyStatus(
        'No se pudo copiar automáticamente. Selecciona y copia el resumen manualmente.',
      );
    }
  }

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
          Completa tus datos, revisa el resumen y decide cuándo abrir WhatsApp.
          Nada se envía al revisar la solicitud.
        </p>
      </header>

      {!hydrated ? (
        <p className="request-page__loading" role="status">
          Cargando tu carrito…
        </p>
      ) : lines.length === 0 ? (
        <section className="request-empty" aria-labelledby="empty-order-title">
          <p className="request-empty__number" aria-hidden="true">
            00
          </p>
          <div>
            <h2 id="empty-order-title">Agrega productos antes de continuar</h2>
            <p>
              Tu solicitud necesita al menos una opción del menú para crear el
              resumen.
            </p>
            <Link className="button-link button-link--primary" href="/menu/">
              Ir al menú
            </Link>
          </div>
        </section>
      ) : (
        <div className="order-layout">
          <form className="order-form" noValidate onSubmit={reviewRequest}>
            {Object.keys(errors).length > 0 ? (
              <div
                className="order-errors"
                ref={errorSummaryRef}
                role="alert"
                tabIndex={-1}
              >
                <h2>Revisa los campos</h2>
                <p>Corrige lo indicado y vuelve a revisar tu solicitud.</p>
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

            <fieldset className="order-form__section">
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

            <fieldset className="order-form__section">
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

            <button className="order-form__submit" type="submit">
              Revisar solicitud
            </button>
          </form>

          {summary ? (
            <section className="order-summary" aria-labelledby="summary-title">
              <p className="eyebrow">Todavía no se ha enviado</p>
              <h2 id="summary-title">Tu solicitud está lista para revisar</h2>
              <p>{operationalCopy.confirmation}</p>
              <label htmlFor="order-summary-text">
                Resumen de la solicitud
              </label>
              <textarea
                id="order-summary-text"
                rows={16}
                value={summary}
                readOnly
              />
              <div className="order-summary__actions">
                <button type="button" onClick={copySummary}>
                  Copiar resumen
                </button>
                {handoff.kind === 'live' ? (
                  <a
                    className="button-link button-link--primary"
                    href={buildWhatsAppUrl(handoff.destination, summary)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Enviar pedido por WhatsApp
                  </a>
                ) : (
                  <p className="order-summary__handoff-note">
                    {handoff.kind === 'demo'
                      ? 'Modo demostración: copia el resumen para probar el flujo.'
                      : 'El envío por WhatsApp no está configurado. Copia el resumen para conservarlo.'}
                  </p>
                )}
              </div>
              {copyStatus ? (
                <p className="order-summary__status" role="status">
                  {copyStatus}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
