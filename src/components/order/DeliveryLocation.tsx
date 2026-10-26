'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { z } from 'zod';
import {
  deliveryPointSchema,
  type DeliveryPoint,
  type DeliverySelection,
} from '@/domain/delivery';
import { formatGTQ } from '@/lib/money';
const Map = dynamic(() => import('./DeliveryMap').then((m) => m.DeliveryMap), {
  ssr: false,
});
const searchSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  results: z
    .array(z.object({ label: z.string(), point: deliveryPointSchema }))
    .max(5),
});
const quoteSchema = z.object({
  quote: z.object({
    kind: z.enum(['manual', 'automatic']),
    shippingMinor: z.number().int().nonnegative().nullable(),
    token: z.string().optional(),
    expiresAt: z.string().optional(),
  }),
});
export function DeliveryLocation({
  address,
  subtotal,
  onChange,
  onPendingChange,
}: {
  address: string;
  subtotal: number;
  onChange: (s: DeliverySelection | null) => void;
  onPendingChange: (p: boolean) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [results, setResults] = useState<
    { label: string; point: DeliveryPoint }[]
  >([]);
  const [point, setPoint] = useState<DeliveryPoint | null>(null);
  const [selection, setSelection] = useState<DeliverySelection | null>(null);
  const [message, setMessage] = useState(
    'Envío por confirmar. Puedes continuar con la dirección escrita para cotización manual.',
  );
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expired, setExpired] = useState(false);
  const requestId = useRef(0);
  const pendingCallback = useRef(onPendingChange);
  useEffect(() => {
    pendingCallback.current = onPendingChange;
  }, [onPendingChange]);
  useEffect(
    () => () => {
      requestId.current++;
      pendingCallback.current(false);
    },
    [],
  );
  useEffect(() => {
    if (!selection?.expiresAt) return;
    const delay = Date.parse(selection.expiresAt) - Date.now();
    const timer = setTimeout(
      () => {
        setExpired(true);
        setMessage('La cotización venció. Confirma nuevamente la ubicación.');
      },
      Math.max(0, delay),
    );
    return () => clearTimeout(timer);
  }, [selection]);
  function clearQuote() {
    requestId.current++;
    setPending(false);
    onPendingChange(false);
    setSelection(null);
    setExpired(false);
    onChange(null);
  }
  function choose(p: DeliveryPoint) {
    clearQuote();
    setPoint(p);
    setMessage('Revisa el marcador y confirma que corresponde a tu dirección.');
  }
  async function search() {
    clearQuote();
    setPoint(null);
    setResults([]);
    setFailed(false);
    const id = ++requestId.current;
    setPending(true);
    onPendingChange(true);
    try {
      const response = await fetch('/api/delivery/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, consent }),
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error();
      const data = searchSchema.parse(await response.json());
      if (id !== requestId.current) return;
      setResults(data.results);
      setMessage(
        data.status === 'ok' && data.results.length
          ? 'Elige la coincidencia correcta; no se selecciona una tarifa por el nombre.'
          : 'Mapa o búsqueda no disponible. Envío por confirmar; conserva tu dirección para cotización manual.',
      );
    } catch {
      if (id === requestId.current)
        setMessage(
          'No se pudo buscar la dirección. Envío por confirmar; puedes continuar sin mapa.',
        );
    } finally {
      if (id === requestId.current) {
        setPending(false);
        onPendingChange(false);
      }
    }
  }
  async function confirm() {
    if (!point || failed) return;
    const id = ++requestId.current;
    setSelection(null);
    onChange(null);
    setPending(true);
    onPendingChange(true);
    setExpired(false);
    try {
      const response = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fulfillment: 'delivery',
          address,
          point,
          confirmed: true,
        }),
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error();
      const { quote } = quoteSchema.parse(await response.json());
      if (id !== requestId.current) return;
      if (
        quote.kind === 'manual' &&
        (quote.shippingMinor !== null || quote.token || quote.expiresAt)
      )
        throw new Error();
      if (
        quote.kind === 'automatic' &&
        (![1000, 3500].includes(quote.shippingMinor ?? -1) ||
          !quote.token ||
          !quote.expiresAt ||
          !Number.isFinite(Date.parse(quote.expiresAt)) ||
          Date.parse(quote.expiresAt) <= Date.now())
      )
        throw new Error();
      const next = {
        point,
        token: quote.token,
        shippingMinor: quote.shippingMinor,
        expiresAt: quote.expiresAt,
      };
      setSelection(next);
      onChange(next);
      setMessage(
        quote.kind === 'automatic'
          ? 'Ubicación confirmada. Revisa el costo antes de enviar.'
          : 'Envío por confirmar. El dueño revisará la ubicación y cotizará manualmente.',
      );
    } catch {
      if (id === requestId.current)
        setMessage(
          'No se pudo cotizar. Envío por confirmar; puedes continuar sin mapa.',
        );
    } finally {
      if (id === requestId.current) {
        setPending(false);
        onPendingChange(false);
      }
    }
  }
  function fallback() {
    clearQuote();
    setPoint(null);
    setResults([]);
    setMessage(
      'Envío por confirmar. Se conserva tu dirección escrita para cotización manual.',
    );
  }
  return (
    <section
      className="delivery-location"
      aria-label="Confirmar ubicación y envío"
    >
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            fallback();
          }}
        />
        Quiero usar el mapa y compartir la dirección buscada y el área del mapa
        con Geoapify. También puedo continuar sin mapa.
      </label>
      <button
        type="button"
        disabled={!consent || address.trim().length < 3 || pending}
        onClick={() => void search()}
      >
        Buscar dirección en el mapa
      </button>
      {results.length ? (
        <ul>
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => choose(r.point)}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {point && consent && !failed ? (
        <>
          <Map
            point={point}
            onChange={choose}
            onFailure={() => {
              clearQuote();
              setFailed(true);
              setMessage(
                'La cartografía no está disponible. Usa cotización manual.',
              );
            }}
          />
          <p>
            Marcador: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}. Arrastra
            el marcador o selecciona otro punto en el mapa.
          </p>
          <button
            type="button"
            disabled={pending || failed}
            onClick={() => void confirm()}
          >
            Confirmar esta ubicación
          </button>
        </>
      ) : null}
      <button type="button" onClick={fallback}>
        Continuar con cotización manual
      </button>
      <p role="status">
        {pending
          ? 'Comprobando ubicación; la cotización anterior ya no está vigente.'
          : message}
      </p>
      <p>Subtotal: {formatGTQ(subtotal)}</p>
      {selection?.shippingMinor !== undefined &&
      selection.shippingMinor !== null &&
      !expired &&
      !pending ? (
        <>
          <p>Envío: {formatGTQ(selection.shippingMinor)}</p>
          <p>Total estimado: {formatGTQ(subtotal + selection.shippingMinor)}</p>
        </>
      ) : (
        <p>Envío por confirmar. Total final pendiente.</p>
      )}
      {consent ? (
        <p>
          Powered by{' '}
          <a href="https://www.geoapify.com/" rel="noreferrer">
            Geoapify
          </a>{' '}
          · Datos ©{' '}
          <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">
            OpenStreetMap
          </a>
        </p>
      ) : null}
    </section>
  );
}
