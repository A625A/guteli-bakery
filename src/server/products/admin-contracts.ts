import { z } from 'zod';

export const catalogSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const nullableTrimmedString = (maximum: number) =>
  z.union([z.string().trim().min(1).max(maximum), z.null()]);

export const adminCategoryCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    slug: catalogSlugSchema,
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(1_000_000),
  })
  .strict();

export const adminCategoryUpdateSchema = adminCategoryCreateSchema
  .extend({
    expectedVersion: z.number().int().positive(),
    confirmAffectedProducts: z.boolean().optional(),
  })
  .strict();

export const adminCategoryDeleteSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    confirmAffectedProducts: z.literal(true),
  })
  .strict();

export const adminProductCreateSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().trim().min(1).max(160),
    slug: catalogSlugSchema,
    description: z.string().trim().max(4_000),
    saleUnit: nullableTrimmedString(80),
    sku: nullableTrimmedString(80),
    priceMinor: z.number().int().min(0).max(2_147_483_647),
    stockQuantity: z.number().int().min(0).max(2_147_483_647).nullable(),
    active: z.boolean(),
    featured: z.boolean(),
    sortOrder: z.number().int().min(0).max(1_000_000),
  })
  .strict();

export const adminProductUpdateSchema = adminProductCreateSchema
  .extend({ expectedVersion: z.number().int().positive() })
  .strict();

export const adminProductDeleteSchema = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();

export const adminProductDuplicateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    slug: catalogSlugSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export type AdminCategoryCreateInput = z.infer<
  typeof adminCategoryCreateSchema
>;
export type AdminCategoryUpdateInput = z.infer<
  typeof adminCategoryUpdateSchema
>;
export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;

export type AdminProductInput = Readonly<
  AdminProductCreateInput & { version: number }
>;

function positiveInteger(value: unknown, fallback: number) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new RangeError('Invalid catalog pagination.');
    }
    value = Number(value);
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('Invalid catalog pagination.');
  }
  return value;
}

export function parseAdminCatalogPagination(
  input: Readonly<{ page?: unknown; pageSize?: unknown }> = {},
) {
  const page = positiveInteger(input.page, 1);
  const pageSize = positiveInteger(input.pageSize, 25);
  const offset = (page - 1) * pageSize;
  if (pageSize > 100 || !Number.isSafeInteger(offset)) {
    throw new RangeError('Invalid catalog pagination.');
  }
  return { page, pageSize, offset } as const;
}
