'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { publicSiteConfig } from '@/config/public-site';
import { buildCheckoutWhatsAppUrl } from '@/lib/whatsapp';

type Summary = {
  version: string;
  message: string;
  pricedAt: string;
  validUntil: string | null;
};
type Preview = Summary & { expiresAt: number };
// Conservative UI fallback, not a claimed WhatsApp protocol limit.
const MAX_LINK_LENGTH = 6000;

export function WhatsAppOrderSummary({
  publicId,
  receiptToken,
}: {
  publicId: string;
  receiptToken?: string;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const active = useRef<AbortController | null>(null);
  const popup = useRef<Window | null>(null);
  const selectText = useRef(false);
  const text = useRef<HTMLTextAreaElement>(null);

  function clear() {
    generation.current++;
    active.current?.abort();
    active.current = null;
    popup.current?.close();
    popup.current = null;
    setBusy(false);
    setPreview(null);
  }
  useEffect(() => {
    const cancel = () => {
      generation.current++;
      active.current?.abort();
      active.current = null;
      popup.current?.close();
      popup.current = null;
    };
    const invalidate = () => {
      if (document.visibilityState !== 'visible') return;
      cancel();
      setBusy(false);
      setPreview(null);
    };
    window.addEventListener('focus', invalidate);
    document.addEventListener('visibilitychange', invalidate);
    return () => {
      cancel();
      window.removeEventListener('focus', invalidate);
      document.removeEventListener('visibilitychange', invalidate);
    };
  }, [publicId]);
  useEffect(() => {
    if (preview && selectText.current) {
      selectText.current = false;
      text.current?.focus();
      text.current?.select();
    }
  }, [preview]);
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(
      () => {
        setPreview(null);
        setNotice('Actualiza el resumen para consultar los precios vigentes.');
      },
      Math.max(0, preview.expiresAt - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [preview]);

  async function prepare(action: 'preview' | 'copy' | 'open') {
    if (active.current) return;
    // Reserve the window during the tap; mobile browsers block windows opened
    // after an asynchronous request. It contains no customer data or tokens.
    if (action === 'open' && publicSiteConfig.handoff.kind === 'live') {
      try {
        popup.current = window.open('about:blank', '_blank');
        if (popup.current) popup.current.opener = null;
      } catch {
        popup.current = null;
      }
    }
    const id = ++generation.current;
    const controller = new AbortController();
    active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    const started = performance.now();
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/checkout-summary', {
        method: 'POST',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(receiptToken ? { 'x-order-receipt': receiptToken } : {}),
        },
        body: JSON.stringify({
          publicId,
          ...(action !== 'preview' && preview
            ? { expectedVersion: preview.version }
            : {}),
        }),
      });
      if (response.status !== 409 && !response.ok)
        throw new Error('Summary unavailable');
      const { summary } = (await response.json()) as { summary: Summary };
      if (generation.current !== id) return;
      const ttl =
        Math.min(
          30000,
          summary.validUntil
            ? Date.parse(summary.validUntil) - Date.parse(summary.pricedAt)
            : 30000,
        ) -
        (performance.now() - started);
      if (ttl <= 0) throw new Error('Summary expired');
      const next = { ...summary, expiresAt: performance.now() + ttl };
      setPreview(next);
      if (response.status === 409) {
        popup.current?.close();
        popup.current = null;
        setNotice(
          'El pedido cambió. Revisa el resumen actualizado antes de compartirlo.',
        );
        return;
      }
      if (action === 'copy') {
        try {
          await navigator.clipboard.writeText(summary.message);
          if (generation.current === id)
            setNotice('Resumen copiado. Pégalo en el chat y pulsa Enviar.');
        } catch {
          if (generation.current === id) {
            setNotice(
              'No pudimos copiar automáticamente. Selecciona el texto del resumen y cópialo manualmente.',
            );
            selectText.current = true;
            requestAnimationFrame(() => {
              if (generation.current === id && text.current) {
                selectText.current = false;
                text.current.focus();
                text.current.select();
              }
            });
          }
        }
      }
      if (action === 'open') {
        const url = buildCheckoutWhatsAppUrl(
          publicSiteConfig.handoff,
          summary.message,
        );
        if (!url) {
          setNotice(
            'El envío por WhatsApp no está habilitado en este entorno. Puedes copiar el resumen.',
          );
        } else if (url.length > MAX_LINK_LENGTH) {
          popup.current?.close();
          popup.current = null;
          setNotice(
            'El resumen es largo. Cópialo y pégalo en el chat; no se recortó ningún producto.',
          );
        } else if (popup.current && !popup.current.closed) {
          // Suppress the private confirmation URL as referrer on navigation.
          const policy = popup.current.document.createElement('meta');
          policy.name = 'referrer';
          policy.content = 'no-referrer';
          popup.current.document.head.append(policy);
          popup.current.location.replace(url);
          popup.current = null;
          setNotice(
            'WhatsApp requiere que pulses Enviar. Si no se abrió, copia el resumen o usa Contactar a Güteli.',
          );
        } else {
          setNotice(
            'El navegador bloqueó la apertura. Pulsa Enviar pedido por WhatsApp para reintentar o copia el resumen y pégalo en el chat.',
          );
        }
      }
    } catch {
      if (generation.current === id) {
        popup.current?.close();
        popup.current = null;
        setPreview(null);
        setNotice(
          'No pudimos preparar el resumen. Tu sesión pudo vencer; revisa el pedido o contacta a Güteli.',
        );
      }
    } finally {
      clearTimeout(timeout);
      if (generation.current === id) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  const previewUrl = preview
    ? buildCheckoutWhatsAppUrl(publicSiteConfig.handoff, preview.message)
    : null;
  const tooLong = previewUrl !== null && previewUrl.length > MAX_LINK_LENGTH;
  return (
    <section
      className="order-whatsapp"
      aria-labelledby="whatsapp-summary-heading"
      aria-busy={busy}
    >
      <h2 id="whatsapp-summary-heading">Comparte tu pedido por WhatsApp</h2>
      <p>
        Tu pedido ya está guardado. El mensaje incluye su referencia, productos
        y precios; tus datos de contacto y dirección quedan en la consulta
        privada de la tienda. Debes pulsar Enviar en WhatsApp. Abrirlo no
        confirma el envío del mensaje ni el pago.
      </p>
      <button
        className="button-link button-link--primary"
        disabled={busy || tooLong}
        onClick={() => void prepare('open')}
      >
        Enviar pedido por WhatsApp
      </button>
      <button
        className="button-link button-link--secondary"
        disabled={busy}
        onClick={() => void prepare('preview')}
      >
        Ver resumen antes de compartir
      </button>
      <button
        className="button-link button-link--secondary"
        disabled={busy}
        onClick={() => void prepare('copy')}
      >
        Copiar resumen
      </button>
      {notice ? <p role="status">{notice}</p> : null}
      {publicSiteConfig.handoff.kind !== 'live' ? (
        <p>
          El envío por WhatsApp no está habilitado en este entorno. Puedes
          copiar el resumen.
        </p>
      ) : null}
      {preview ? (
        <>
          <label htmlFor="whatsapp-summary-text">Resumen para compartir</label>
          <textarea
            ref={text}
            id="whatsapp-summary-text"
            value={preview.message}
            readOnly
            rows={14}
            spellCheck={false}
          />
          {tooLong ? (
            <p>
              El resumen es largo. Copia el texto completo y pégalo en el chat.
            </p>
          ) : null}
          <div className="order-confirmation__actions">
            <button
              className="button-link button-link--secondary"
              onClick={clear}
            >
              Ocultar resumen
            </button>
          </div>
        </>
      ) : null}
      <Link href="/contact/">Contactar a Güteli</Link>
    </section>
  );
}
