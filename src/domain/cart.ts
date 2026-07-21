import type { MenuProduct, MenuProductId } from '@/content/menu';
import { menuProductIds, menuProducts } from '@/content/menu';

export type CartItem = { productId: MenuProductId; quantity: number };

export type CartLine = CartItem & {
  product: MenuProduct;
  lineTotal: number;
};

const isQuantity = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 99;

const isMenuProductId = (value: unknown): value is MenuProductId =>
  typeof value === 'string' && menuProductIds.includes(value as MenuProductId);

export function addCartItem(
  cart: readonly CartItem[],
  productId: MenuProductId,
  quantity: number,
): CartItem[] {
  if (!isQuantity(quantity)) {
    return [...cart];
  }

  const existingItem = cart.find((item) => item.productId === productId);

  if (!existingItem) {
    return [...cart, { productId, quantity }];
  }

  return cart.map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.min(item.quantity + quantity, 99) }
      : item,
  );
}

export function updateCartItem(
  cart: readonly CartItem[],
  productId: MenuProductId,
  quantity: number,
): CartItem[] {
  if (!isQuantity(quantity)) {
    return [...cart];
  }

  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity } : item,
  );
}

export function removeCartItem(
  cart: readonly CartItem[],
  productId: MenuProductId,
): CartItem[] {
  return cart.filter((item) => item.productId !== productId);
}

export function parseStoredCart(value: string | null): CartItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const cart: CartItem[] = [];
    const productIds = new Set<MenuProductId>();

    for (const item of parsed) {
      if (
        !isStoredCartItem(item) ||
        !isMenuProductId(item.productId) ||
        productIds.has(item.productId) ||
        !isQuantity(item.quantity)
      ) {
        return [];
      }

      productIds.add(item.productId);
      cart.push({ productId: item.productId, quantity: item.quantity });
    }

    return cart;
  } catch {
    return [];
  }
}

export function getCartLines(cart: readonly CartItem[]): CartLine[] {
  return cart.flatMap((item) => {
    const product = menuProducts.find(
      (menuProduct) => menuProduct.id === item.productId,
    );

    return product
      ? [{ ...item, product, lineTotal: product.price * item.quantity }]
      : [];
  });
}

export function getCartCount(cart: readonly CartItem[]): number {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function getCartSubtotal(lines: readonly CartLine[]): number {
  return lines.reduce((subtotal, line) => subtotal + line.lineTotal, 0);
}

function isStoredCartItem(
  value: unknown,
): value is { productId: unknown; quantity: unknown } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);

  return (
    keys.length === 2 &&
    keys.includes('productId') &&
    keys.includes('quantity') &&
    'productId' in value &&
    'quantity' in value
  );
}
