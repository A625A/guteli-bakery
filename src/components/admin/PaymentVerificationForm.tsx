'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PaymentMethod } from '@/domain/payment-method';
import { formatGTQ } from '@/lib/money';

export function PaymentVerificationForm({
  publicId,
  version,
  revisionId,
  method,
  totalMinor,
  refund = false,
}: {
  publicId: string;
  version: number;
  revisionId: string;
  method: PaymentMethod;
  totalMinor: number;
  refund?: boolean;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const attemptedBody = useRef<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (running.current || submitted) return;
    // Keep the exact original body/key across network failures; edits require a refresh.
    if (!attemptedBody.current) {
      if (!confirmation || !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
        setMessage(
          'Confirma el cobro real e ingresa el importe con hasta dos decimales.',
        );
        return;
      }
      const [whole, decimal = ''] = amount.split('.');
      const amountMinor = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
      if (amountMinor !== totalMinor) {
        setMessage(
          'El importe debe coincidir exactamente con el total aceptado.',
        );
        return;
      }
      key.current ??= crypto.randomUUID();
      attemptedBody.current = JSON.stringify({
        kind: refund ? 'REFUNDED' : 'VERIFIED',
        amountMinor,
        currency: 'GTQ',
        paymentMethod: method,
        expectedVersion: version,
        revisionId,
        idempotencyKey: key.current,
        confirmation,
        evidence: refund
          ? 'REFUND_RETURNED'
          : method === 'BANK_TRANSFER'
            ? 'BANK_FUNDS_RECEIVED'
            : 'CASH_COLLECTED',
        note,
      });
    }
    running.current = true;
    setPending(true);
    setMessage('');
    setAttempted(true);
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(publicId)}/payment-verification`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: attemptedBody.current,
          signal: AbortSignal.timeout(10000),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setMessage(
          result.error?.message ?? 'Actualiza el pedido antes de continuar.',
        );
        return;
      }
      setSubmitted(true);
      setMessage(
        refund
          ? 'Devolución real registrada. No se realizó ninguna operación bancaria desde el sitio.'
          : 'Pago recibido registrado con auditoría.',
      );
      window.dispatchEvent(
        new CustomEvent('guteli-order-version', {
          detail: { publicId, version: result.order.version },
        }),
      );
      router.refresh();
    } catch {
      setMessage(
        'No se pudo comprobar el resultado. Reintenta con los mismos datos para evitar un registro duplicado.',
      );
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className="admin-auth-card"
      aria-labelledby={refund ? 'refund-title' : 'payment-verification-title'}
    >
      <h2 id={refund ? 'refund-title' : 'payment-verification-title'}>
        {refund
          ? 'Registrar devolución realizada'
          : 'Marcar pago como recibido'}
      </h2>
      <p>
        Total aceptado: {formatGTQ(totalMinor)}.{' '}
        {refund
          ? 'Primero devuelve el importe completo por el medio acordado con el cliente. El sitio solo registra la devolución.'
          : method === 'BANK_TRANSFER'
            ? 'Revisa el abono real en tu banco. Una captura o afirmación del cliente no demuestra que recibiste fondos.'
            : 'Cuenta el efectivo recibido durante la recogida o entrega. No lo registres por anticipado.'}
      </p>
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={pending || submitted || attempted}>
          <label htmlFor="verified-amount">
            {refund ? 'Importe devuelto en Q' : 'Importe recibido en Q'}
          </label>
          <input
            id="verified-amount"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <label htmlFor="payment-note">Referencia interna opcional</label>
          <input
            id="payment-note"
            maxLength={160}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-describedby="payment-note-help"
          />
          <p id="payment-note-help">
            Usa una referencia breve. No ingreses cuentas completas,
            credenciales ni datos personales.
          </p>
          <label>
            <input
              type="checkbox"
              required
              checked={confirmation}
              onChange={(event) => setConfirmation(event.target.checked)}
            />
            {refund
              ? 'Confirmo que devolví el importe completo al cliente.'
              : method === 'BANK_TRANSFER'
                ? 'Confirmo que verifiqué los fondos recibidos en el banco.'
                : 'Confirmo que ya cobré y conté el efectivo.'}
          </label>
        </fieldset>
        <button type="submit" disabled={pending || submitted || !confirmation}>
          {pending
            ? 'Registrando…'
            : attempted
              ? 'Reintentar el mismo registro'
              : refund
                ? 'Registrar reembolso realizado'
                : 'Marcar pago como recibido'}
        </button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
