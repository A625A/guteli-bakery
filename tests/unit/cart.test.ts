import { describe, expect, it } from 'vitest';

import {
  addCartItem,
  getAvailableCartItems,
  getCartCount,
  getCartLines,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  updateCartItem,
} from '@/domain/cart';
import type { PublicProductDto } from '@/server/products/types';

const products: readonly PublicProductDto[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    slug: 'pretzel-original',
    name: 'Originales',
    category: {
      id: '00000000-0000-4000-8000-000000000101',
      slug: 'pretzels',
      name: 'Pretzels',
    },
    priceMinor: 6000,
    saleUnit: 'Bolsa de 5',
    stockAvailable: true,
    imageUrl: '/images/products/pretzel-original.webp',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    slug: 'nuditos',
    name: 'Nuditos',
    category: {
      id: '00000000-0000-4000-8000-000000000104',
      slug: 'nuditos',
      name: 'Nuditos',
    },
    priceMinor: 6000,
    saleUnit: 'Bolsa de 15',
    stockAvailable: true,
    imageUrl: null,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    slug: 'bagel-original',
    name: 'Originales',
    category: {
      id: '00000000-0000-4000-8000-000000000102',
      slug: 'bagels',
      name: 'Bagels',
    },
    priceMinor: 6000,
    saleUnit: null,
    stockAvailable: true,
    imageUrl: '/images/products/bagel-original.webp',
  },
];

const pretzelId = products[0].id;
const nuditosId = products[1].id;
const bagelId = products[2].id;

describe('cart', () => {
  it('merges additions, caps quantities, and calculates minor-unit subtotal', () => {
    let cart = addCartItem([], pretzelId, 2);
    cart = addCartItem(cart, pretzelId, 1);
    cart = addCartItem(cart, nuditosId, 2);
    cart = addCartItem(cart, nuditosId, 99);

    const lines = getCartLines(cart, products);

    expect(getCartCount(cart)).toBe(102);
    expect(lines).toEqual([
      expect.objectContaining({
        productId: pretzelId,
        quantity: 3,
        lineTotal: 18000,
      }),
      expect.objectContaining({
        productId: nuditosId,
        quantity: 99,
        lineTotal: 594000,
      }),
    ]);
    expect(getCartSubtotal(lines)).toBe(612000);
  });

  it('updates and removes products immutably', () => {
    const cart = addCartItem([], bagelId, 1);
    const updatedCart = updateCartItem(cart, bagelId, 3);

    expect(updatedCart).not.toBe(cart);
    expect(updatedCart[0]?.quantity).toBe(3);
    expect(cart[0]?.quantity).toBe(1);
    expect(removeCartItem(cart, bagelId)).toEqual([]);
  });

  it('rejects an invalid quantity update without changing cart contents', () => {
    const cart = addCartItem([], bagelId, 1);

    expect(updateCartItem(cart, bagelId, 1.5)).toEqual(cart);
    expect(updateCartItem(cart, bagelId, 0)).toEqual(cart);
    expect(updateCartItem(cart, bagelId, 100)).toEqual(cart);
  });

  it('rejects invalid quantities when adding a product', () => {
    const cart = [{ productId: nuditosId, quantity: 2 }];

    expect(addCartItem(cart, pretzelId, -1)).toEqual(cart);
    expect(addCartItem(cart, pretzelId, 1.5)).toEqual(cart);
    expect(addCartItem(cart, pretzelId, 100)).toEqual(cart);
  });

  it('restores a valid saved UUID cart', () => {
    const stored = JSON.stringify([
      { productId: pretzelId, quantity: 2 },
      { productId: nuditosId, quantity: 1 },
    ]);

    expect(parseStoredCart(stored)).toEqual([
      { productId: pretzelId, quantity: 2 },
      { productId: nuditosId, quantity: 1 },
    ]);
  });

  it.each([
    null,
    '',
    '{',
    '{}',
    '[{"productId":"unknown","quantity":1}]',
    '[{"productId":"not-a-uuid","quantity":1}]',
    `[ {"productId":"${nuditosId}","quantity":0} ]`,
    `[ {"productId":"${nuditosId}","quantity":1.5} ]`,
    `[ {"productId":"${nuditosId}","quantity":100} ]`,
    `[ {"productId":"${nuditosId}","quantity":1},{"productId":"${nuditosId}","quantity":2} ]`,
    `[ {"productId":"${nuditosId}","quantity":1,"extra":true} ]`,
  ])('recovers unsafe saved data as an empty cart: %s', (value) => {
    expect(parseStoredCart(value)).toEqual([]);
  });

  it('drops valid UUIDs that are unavailable from the current catalog', () => {
    const lines = getCartLines(
      [
        { productId: pretzelId, quantity: 1 },
        { productId: '00000000-0000-4000-8000-000000000099', quantity: 1 },
      ],
      products,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]?.productId).toBe(pretzelId);
  });

  it('drops products marked unavailable from lines and subtotal', () => {
    const unavailableProducts = products.map((product) =>
      product.id === pretzelId
        ? { ...product, stockAvailable: false }
        : product,
    );
    const cart = [
      { productId: pretzelId, quantity: 2 },
      { productId: nuditosId, quantity: 1 },
    ];

    const lines = getCartLines(cart, unavailableProducts);

    expect(lines).toEqual([
      expect.objectContaining({ productId: nuditosId, lineTotal: 6000 }),
    ]);
    expect(getCartSubtotal(lines)).toBe(6000);
    expect(getAvailableCartItems(cart, unavailableProducts)).toEqual([
      { productId: nuditosId, quantity: 1 },
    ]);
  });

  it('rejects unknown and stock-unavailable IDs at the cart input boundary', () => {
    const unavailableProducts = products.map((product) =>
      product.id === pretzelId
        ? { ...product, stockAvailable: false }
        : product,
    );

    expect(addCartItem([], pretzelId, 1, unavailableProducts)).toEqual([]);
    expect(
      addCartItem([], '00000000-0000-4000-8000-000000000099', 1, products),
    ).toEqual([]);
    expect(addCartItem([], nuditosId, 1, products)).toEqual([
      { productId: nuditosId, quantity: 1 },
    ]);
  });
});
