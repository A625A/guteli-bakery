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

import type { MenuProductId } from '@/content/menu';
import {
  addCartItem,
  getCartCount,
  getCartLines,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  updateCartItem,
  type CartItem,
  type CartLine,
} from '@/domain/cart';

const CART_STORAGE_KEY = 'guteli-cart-v1';

type CartState = {
  items: CartItem[];
  hydrated: boolean;
};

type CartAction =
  | { type: 'hydrate'; items: CartItem[] }
  | { type: 'add'; productId: MenuProductId; quantity: number }
  | { type: 'update'; productId: MenuProductId; quantity: number }
  | { type: 'remove'; productId: MenuProductId }
  | { type: 'clear' };

type CartContextValue = {
  items: CartItem[];
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (productId: MenuProductId, quantity: number) => void;
  updateQuantity: (productId: MenuProductId, quantity: number) => void;
  removeItem: (productId: MenuProductId) => void;
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

export function CartProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [{ items, hydrated }, dispatch] = useReducer(cartReducer, initialState);

  useEffect(() => {
    let storedValue: string | null = null;

    try {
      storedValue = window.localStorage.getItem(CART_STORAGE_KEY);
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
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Keep cart actions working even when storage writes are blocked.
    }
  }, [hydrated, items]);

  const lines = useMemo(() => getCartLines(items), [items]);
  const itemCount = useMemo(() => getCartCount(items), [items]);
  const subtotal = useMemo(() => getCartSubtotal(lines), [lines]);

  const addItem = useCallback((productId: MenuProductId, quantity: number) => {
    dispatch({ type: 'add', productId, quantity });
  }, []);
  const updateQuantity = useCallback(
    (productId: MenuProductId, quantity: number) => {
      dispatch({ type: 'update', productId, quantity });
    },
    [],
  );
  const removeItem = useCallback((productId: MenuProductId) => {
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
