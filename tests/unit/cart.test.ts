import { describe, expect, it } from 'vitest';

import {
  addCartItem,
  getCartCount,
  getCartLines,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  updateCartItem,
} from '@/domain/cart';

describe('cart', () => {
  it('merges additions, caps quantities, and calculates subtotal', () => {
    let cart = addCartItem([], 'pretzel-original', 2);
    cart = addCartItem(cart, 'pretzel-original', 1);
    cart = addCartItem(cart, 'nuditos', 2);
    cart = addCartItem(cart, 'nuditos', 99);

    const lines = getCartLines(cart);

    expect(getCartCount(cart)).toBe(102);
    expect(lines).toEqual([
      expect.objectContaining({
        productId: 'pretzel-original',
        quantity: 3,
        lineTotal: 180,
      }),
      expect.objectContaining({
        productId: 'nuditos',
        quantity: 99,
        lineTotal: 5940,
      }),
    ]);
    expect(getCartSubtotal(lines)).toBe(6120);
  });

  it('updates and removes products immutably', () => {
    const cart = addCartItem([], 'bagel-original', 1);
    const updatedCart = updateCartItem(cart, 'bagel-original', 3);

    expect(updatedCart).not.toBe(cart);
    expect(updatedCart[0]?.quantity).toBe(3);
    expect(cart[0]?.quantity).toBe(1);
    expect(removeCartItem(cart, 'bagel-original')).toEqual([]);
  });

  it('rejects an invalid quantity update without changing cart contents', () => {
    const cart = addCartItem([], 'bagel-original', 1);

    expect(updateCartItem(cart, 'bagel-original', 1.5)).toEqual(cart);
    expect(updateCartItem(cart, 'bagel-original', 0)).toEqual(cart);
    expect(updateCartItem(cart, 'bagel-original', 100)).toEqual(cart);
  });

  it('rejects invalid quantities when adding a product', () => {
    const cart = [{ productId: 'nuditos' as const, quantity: 2 }];

    expect(addCartItem(cart, 'pretzel-original', -1)).toEqual(cart);
    expect(addCartItem(cart, 'pretzel-original', 1.5)).toEqual(cart);
    expect(addCartItem(cart, 'pretzel-original', 100)).toEqual(cart);
  });

  it('restores a valid saved cart', () => {
    expect(
      parseStoredCart(
        '[{"productId":"pretzel-original","quantity":2},{"productId":"nuditos","quantity":1}]',
      ),
    ).toEqual([
      { productId: 'pretzel-original', quantity: 2 },
      { productId: 'nuditos', quantity: 1 },
    ]);
  });

  it.each([
    null,
    '',
    '{',
    '{}',
    '[{"productId":"unknown","quantity":1}]',
    '[{"productId":"nuditos","quantity":0}]',
    '[{"productId":"nuditos","quantity":1.5}]',
    '[{"productId":"nuditos","quantity":100}]',
    '[{"productId":"nuditos","quantity":1},{"productId":"nuditos","quantity":2}]',
    '[{"productId":"nuditos","quantity":1,"extra":true}]',
  ])('recovers unsafe saved data as an empty cart: %s', (value) => {
    expect(parseStoredCart(value)).toEqual([]);
  });
});
