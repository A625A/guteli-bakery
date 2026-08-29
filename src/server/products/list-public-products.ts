import { createObjectStorage } from '@/server/storage';
import { cache } from 'react';

import { findPublicProducts } from './repository';
import type { ObjectStorage } from '@/server/storage';
import type { PublicCatalogDto, PublicProductDto } from './types';

type MutableCategory = {
  id: string;
  slug: string;
  name: string;
  products: PublicProductDto[];
};

export async function listPublicProducts(
  database?: Parameters<typeof findPublicProducts>[0],
  storage: ObjectStorage = createObjectStorage(),
): Promise<PublicCatalogDto> {
  const products = await findPublicProducts(database, storage);
  const categories = new Map<string, MutableCategory>();

  for (const product of products) {
    const category = categories.get(product.category.id);
    if (category) {
      category.products.push(product);
      continue;
    }
    categories.set(product.category.id, {
      ...product.category,
      products: [product],
    });
  }

  return { categories: [...categories.values()] };
}

// React's cache is request-scoped in the Next.js server render. This lets the
// root layout and menu page share one catalog read without cross-request data.
export const getPublicCatalog = cache(() => listPublicProducts());
