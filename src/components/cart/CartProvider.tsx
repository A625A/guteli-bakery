'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import {
  addCartItem,
  getCartCount,
  getCartLines,
  getCartSubtotal,
  getAvailableCartItems,
  isAvailableProduct,
  parseStoredCart,
  removeCartItem,
  updateCartItem,
  type CartItem,
  type CartLine,
} from '@/domain/cart';
import type { PublicProductDto } from '@/server/products/types';

export const CART_STORAGE_KEY = 'guteli-cart-v2';
const LEGACY_CART_STORAGE_KEY = 'guteli-cart-v1';

type CartState = {
  items: CartItem[];
  hydrated: boolean;
};

type CartAction =
  | { type: 'hydrate'; items: CartItem[] }
  | { type: 'add'; productId: string; quantity: number }
  | { type: 'update'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

type CartContextValue = {
  items: CartItem[];
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (productId: string, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const initialState: CartState = { items: [], hydrated: false };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'hydrate':
      return { items: action.items, hydrated: true };
    case 'add':
      return {
        ...state,
        items: addCartItem(state.items, action.productId, action.quantity),
      };
    case 'update':
      return {
        ...state,
        items: updateCartItem(state.items, action.productId, action.quantity),
      };
    case 'remove':
      return {
        ...state,
        items: removeCartItem(state.items, action.productId),
      };
    case 'clear':
      return { ...state, items: [] };
  }
}

export function CartProvider({
  children,
  products,
}: Readonly<{ children: ReactNode; products: readonly PublicProductDto[] }>) {
  const [{ items, hydrated }, dispatch] = useReducer(cartReducer, initialState);

  const availableItems = useMemo(
    () => getAvailableCartItems(items, products),
    [items, products],
  );

  useEffect(() => {
    let storedValue: string | null = null;

    try {
      storedValue = window.localStorage.getItem(CART_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    } catch {
      // Storage can be unavailable; the in-memory cart remains usable.
    }

    dispatch({ type: 'hydrate', items: parseStoredCart(storedValue) });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(availableItems),
      );
    } catch {
      // Keep cart actions working even when storage writes are blocked.
    }
  }, [availableItems, hydrated]);

  const lines = useMemo(
    () => getCartLines(availableItems, products),
    [availableItems, products],
  );
  const itemCount = useMemo(
    () => getCartCount(availableItems),
    [availableItems],
  );
  const subtotal = useMemo(() => getCartSubtotal(lines), [lines]);

  const addItem = useCallback(
    (productId: string, quantity: number) => {
      if (isAvailableProduct(productId, products)) {
        dispatch({ type: 'add', productId, quantity });
      }
    },
    [products],
  );
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'update', productId, quantity });
  }, []);
  const removeItem = useCallback((productId: string) => {
    dispatch({ type: 'remove', productId });
  }, []);
  const clearCart = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      lines,
      itemCount,
      subtotal,
      hydrated,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      addItem,
      clearCart,
      hydrated,
      itemCount,
      items,
      lines,
      removeItem,
      subtotal,
      updateQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider.');
  }

  return context;
}
