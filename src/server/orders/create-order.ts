import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { CreateOrderRequest } from '@/domain/order-contract';
import { createPublicOrderId, hashReceiptToken } from './identifiers';
import {
  acquireIdempotencyLock,
  CREATE_ORDER_OPERATION,
  decrementTrackedStock,
  findIdempotentOrder,
  insertIdempotencyRecord,
  insertOrder,
  insertOrderCreatedAuditLog,
  insertOrderCreatedOutboxEvent,
  insertOrderItems,
  lockRequestedProducts,
} from './repository';
import type { LockedProduct, PersistedOrder } from './repository';
import { hashCreateOrderRequest } from './request-hash';
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrdersDatabase,
} from './types';

const MAX_MINOR_UNITS = 2_147_483_647;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IDENTIFIER_ATTEMPTS = 5;

type OrderErrorCode =
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR'
  | 'PRODUCT_OUT_OF_STOCK'
  | 'PRODUCT_UNAVAILABLE';

type PricedItem = Readonly<{
  product: LockedProduct;
  quantity: number;
  lineTotalMinor: number;
}>;

type PricedOrder = Readonly<{
  items: readonly PricedItem[];
  subtotalMinor: number;
  shippingMinor: number | null;
  totalMinor: number | null;
}>;

type ResolvedDependencies = Readonly<{
  database: OrdersDatabase;
  now: Date;
  createOrderId: () => string;
  createPublicId: (now: Date) => string;
}>;

export class CreateOrderError extends Error {
  readonly code: OrderErrorCode;

  constructor(code: OrderErrorCode) {
    super(code);
    this.name = 'CreateOrderError';
    this.code = code;
  }
}

async function getDatabase(database?: OrdersDatabase) {
  return database ?? (await import('@/server/db/client')).db;
}

async function resolveDependencies(
  input: CreateOrderInput,
): Promise<ResolvedDependencies> {
  const now = input.now;
  if (Number.isNaN(now.getTime())) {
    throw new CreateOrderError('INTERNAL_ERROR');
  }

  return {
    database: await getDatabase(input.database),
    now,
    createOrderId: input.createOrderId ?? randomUUID,
    createPublicId: input.createPublicId ?? createPublicOrderId,
  };
}

function assertReceiptTokenSecret(secret: string) {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new CreateOrderError('INTERNAL_ERROR');
  }
}

function deriveReceiptToken(
  orderId: string,
  input: Pick<
    CreateOrderInput,
    'idempotencyKey' | 'idempotencySubject' | 'receiptTokenSecret'
  >,
) {
  assertReceiptTokenSecret(input.receiptTokenSecret);

  return createHmac('sha256', input.receiptTokenSecret)
    .update('guteli:receipt-token:v1\u0000')
    .update(orderId)
    .update('\u0000')
    .update(CREATE_ORDER_OPERATION)
    .update('\u0000')
    .update(input.idempotencySubject)
    .update('\u0000')
    .update(input.idempotencyKey)
    .digest('base64url');
}

function safeEquals(left: string, right: string) {
  const leftValue = Buffer.from(left);
  const rightValue = Buffer.from(right);

  return (
    leftValue.length === rightValue.length &&
    timingSafeEqual(leftValue, rightValue)
  );
}

function toFulfillment(value: CreateOrderRequest['fulfillment']) {
  return value === 'pickup' ? 'PICKUP' : 'DELIVERY';
}

function orderProductIds(request: CreateOrderRequest) {
  return [...request.items].map(({ productId }) => productId).sort();
}

function priceOrder(
  request: CreateOrderRequest,
  lockedProducts: readonly LockedProduct[],
): PricedOrder {
  const requestedProductIds = orderProductIds(request);
  if (lockedProducts.length !== requestedProductIds.length) {
    throw new CreateOrderError('PRODUCT_UNAVAILABLE');
  }

  const productsById = new Map(
    lockedProducts.map((product) => [product.id, product]),
  );
  let subtotalMinor = 0;
  const items = request.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new CreateOrderError('PRODUCT_UNAVAILABLE');
    }
    if (
      product.stockQuantity !== null &&
      product.stockQuantity < item.quantity
    ) {
      throw new CreateOrderError('PRODUCT_OUT_OF_STOCK');
    }

    const lineTotalMinor = checkedMinorProduct(
      product.priceMinor,
      item.quantity,
    );
    subtotalMinor = checkedMinorSum(subtotalMinor, lineTotalMinor);
    return { product, quantity: item.quantity, lineTotalMinor };
  });

  if (request.fulfillment === 'pickup') {
    return {
      items,
      subtotalMinor,
      shippingMinor: 0,
      totalMinor: subtotalMinor,
    };
  }

  return {
    items,
    subtotalMinor,
    shippingMinor: null,
    totalMinor: null,
  };
}

function checkedMinorProduct(unitPriceMinor: number, quantity: number) {
  if (
    !Number.isSafeInteger(unitPriceMinor) ||
    !Number.isSafeInteger(quantity) ||
    unitPriceMinor < 0 ||
    quantity < 0
  ) {
    throw new CreateOrderError('INTERNAL_ERROR');
  }

  const result = unitPriceMinor * quantity;
  if (!Number.isSafeInteger(result) || result > MAX_MINOR_UNITS) {
    throw new CreateOrderError('INTERNAL_ERROR');
  }
  return result;
}

function checkedMinorSum(left: number, right: number) {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result > MAX_MINOR_UNITS) {
    throw new CreateOrderError('INTERNAL_ERROR');
  }
  return result;
}

function postgresErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  const cause = 'cause' in error ? error.cause : error;
  if (!cause || typeof cause !== 'object') return null;

  return {
    code: 'code' in cause ? cause.code : undefined,
    constraint: 'constraint' in cause ? cause.constraint : undefined,
  };
}

function isOrderIdentifierCollision(error: unknown) {
  const details = postgresErrorDetails(error);
  return (
    details?.code === '23505' &&
    (details.constraint === 'orders_public_id_idx' ||
      details.constraint === 'orders_receipt_token_hash_idx' ||
      details.constraint === 'orders_pkey')
  );
}

function isIdempotencyRace(error: unknown) {
  const details = postgresErrorDetails(error);
  return (
    details?.code === '23505' &&
    details.constraint === 'idempotency_records_operation_subject_key_idx'
  );
}

function createResult(
  kind: CreateOrderResult['kind'],
  order: PersistedOrder,
  input: CreateOrderInput,
): CreateOrderResult {
  const receiptToken = deriveReceiptToken(order.id, input);
  if (!safeEquals(hashReceiptToken(receiptToken), order.receiptTokenHash)) {
    throw new CreateOrderError('INTERNAL_ERROR');
  }

  return {
    kind,
    order: {
      publicId: order.publicId,
      receiptToken,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      subtotalMinor: order.subtotalMinor,
      shippingMinor: order.shippingMinor,
      totalMinor: order.totalMinor,
    },
  };
}

async function persistOrder(
  transaction: Parameters<OrdersDatabase['transaction']>[0] extends (
    transaction: infer Transaction,
  ) => unknown
    ? Transaction
    : never,
  input: CreateOrderInput,
  dependencies: ResolvedDependencies,
  pricedOrder: PricedOrder,
) {
  const fulfillment = toFulfillment(input.request.fulfillment);
  let order: PersistedOrder | null = null;
  let receiptToken: string | null = null;

  for (let attempt = 0; attempt < MAX_IDENTIFIER_ATTEMPTS; attempt += 1) {
    const id = dependencies.createOrderId();
    const candidateReceiptToken = deriveReceiptToken(id, input);
    try {
      order = await transaction.transaction((savepoint) =>
        insertOrder(savepoint, {
          id,
          publicId: dependencies.createPublicId(dependencies.now),
          customerName: input.request.customerName,
          phone: input.request.phone,
          fulfillment,
          requestedDate: input.request.requestedDate,
          deliveryLocation:
            input.request.fulfillment === 'delivery'
              ? (input.request.deliveryLocation ?? null)
              : null,
          notes: input.request.notes ?? null,
          subtotalMinor: pricedOrder.subtotalMinor,
          shippingMinor: pricedOrder.shippingMinor,
          totalMinor: pricedOrder.totalMinor,
          receiptTokenHash: hashReceiptToken(candidateReceiptToken),
        }),
      );
      receiptToken = candidateReceiptToken;
      break;
    } catch (error) {
      if (isOrderIdentifierCollision(error)) continue;
      throw error;
    }
  }

  if (!order || !receiptToken) {
    throw new CreateOrderError('INTERNAL_ERROR');
  }

  await insertOrderItems(
    transaction,
    pricedOrder.items.map(({ product, quantity, lineTotalMinor }) => ({
      orderId: order.id,
      sourceProductId: product.id,
      productName: product.name,
      categoryLabel: product.categoryLabel,
      saleUnit: product.saleUnit,
      unitPriceMinor: product.priceMinor,
      quantity,
      lineTotalMinor,
    })),
  );

  for (const { product, quantity } of pricedOrder.items) {
    if (product.stockQuantity === null) continue;
    const decremented = await decrementTrackedStock(
      transaction,
      product.id,
      quantity,
      dependencies.now,
    );
    if (decremented.length !== 1) {
      throw new CreateOrderError('PRODUCT_OUT_OF_STOCK');
    }
  }

  await insertIdempotencyRecord(transaction, {
    subject: input.idempotencySubject,
    key: input.idempotencyKey,
    requestHash: hashCreateOrderRequest(input.request),
    orderId: order.id,
    expiresAt: new Date(dependencies.now.getTime() + IDEMPOTENCY_TTL_MS),
  });
  await insertOrderCreatedOutboxEvent(
    transaction,
    { orderId: order.id, requestId: input.requestId },
    dependencies.now,
  );
  await insertOrderCreatedAuditLog(transaction, {
    orderId: order.id,
    requestId: input.requestId,
    fulfillment,
    itemCount: pricedOrder.items.length,
  });

  return createResult('created', order, input);
}

async function createOrderInTransaction(
  input: CreateOrderInput,
  dependencies: ResolvedDependencies,
) {
  const requestHash = hashCreateOrderRequest(input.request);
  return dependencies.database.transaction(async (transaction) => {
    await acquireIdempotencyLock(
      transaction,
      CREATE_ORDER_OPERATION,
      input.idempotencySubject,
      input.idempotencyKey,
    );
    const existing = await findIdempotentOrder(
      transaction,
      CREATE_ORDER_OPERATION,
      input.idempotencySubject,
      input.idempotencyKey,
    );
    if (existing) {
      if (!safeEquals(existing.requestHash, requestHash)) {
        throw new CreateOrderError('IDEMPOTENCY_CONFLICT');
      }
      return createResult('replayed', existing, input);
    }

    const lockedProducts = await lockRequestedProducts(
      transaction,
      orderProductIds(input.request),
    );
    const pricedOrder = priceOrder(input.request, lockedProducts);
    return persistOrder(transaction, input, dependencies, pricedOrder);
  });
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const dependencies = await resolveDependencies(input);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await createOrderInTransaction(input, dependencies);
    } catch (error) {
      if (isIdempotencyRace(error) && attempt === 0) continue;
      throw error;
    }
  }

  throw new CreateOrderError('INTERNAL_ERROR');
}
