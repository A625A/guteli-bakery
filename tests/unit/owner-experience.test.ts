import { expect, it } from 'vitest';
import { suggestSlug } from '@/lib/suggest-slug';
import { OwnerUiError, ownerErrorMessage } from '@/lib/owner-ui-error';
import {
  methodMatchesFulfillment,
  paymentStatusLabel,
} from '@/domain/payment-method';
it('suggests readable identifiers without changing existing links', () => {
  expect(suggestSlug('Pan de Café & Canela')).toBe('pan-de-cafe-canela');
  expect(suggestSlug('  Piñita 2  ')).toBe('pinita-2');
});
it('does not expose browser/network errors as mixed-language UI', () => {
  expect(
    ownerErrorMessage(new TypeError('Failed to fetch'), 'Revisa tu conexión.'),
  ).toBe('Revisa tu conexión.');
  expect(
    ownerErrorMessage(new OwnerUiError('El pedido cambió.'), 'Error.'),
  ).toBe('El pedido cambió.');
});
it('keeps payment choices separate from verification and delivery mode', () => {
  expect(methodMatchesFulfillment('CASH_PICKUP', 'DELIVERY')).toBe(false);
  expect(methodMatchesFulfillment('CASH_DELIVERY', 'PICKUP')).toBe(false);
  expect(methodMatchesFulfillment('BANK_TRANSFER', 'PICKUP')).toBe(true);
  expect(paymentStatusLabel('PAID')).toContain('sin verificación');
});
