import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { orders } from './orders';

export const outboxStateEnum = pgEnum('outbox_state', [
  'PENDING',
  'BLOCKED',
  'SENT',
  'FAILED',
]);

export type OrderOutboxPayload = {
  orderId: string;
  requestId: string;
};

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operation: varchar('operation', { length: 64 }).notNull(),
    subject: varchar('subject', { length: 128 }).notNull(),
    key: varchar('key', { length: 128 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, {
        onDelete: 'no action',
        onUpdate: 'no action',
      }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('idempotency_records_operation_subject_key_idx').on(
      table.operation,
      table.subject,
      table.key,
    ),
    index('idempotency_records_expires_at_idx').on(table.expiresAt),
  ],
);

export const rateLimitBuckets = pgTable(
  'rate_limit_buckets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    policy: varchar('policy', { length: 64 }).notNull(),
    subject: varchar('subject', { length: 128 }).notNull(),
    windowStartedAt: timestamp('window_started_at', {
      withTimezone: true,
    }).notNull(),
    count: integer('count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('rate_limit_buckets_policy_subject_window_idx').on(
      table.policy,
      table.subject,
      table.windowStartedAt,
    ),
    check('rate_limit_buckets_count_nonnegative', sql`${table.count} >= 0`),
  ],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload').$type<OrderOutboxPayload>().notNull(),
    state: outboxStateEnum('state').notNull().default('PENDING'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    providerMessageId: varchar('provider_message_id', { length: 256 }),
    lastErrorCode: varchar('last_error_code', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (table) => [
    index('outbox_events_due_work_idx').on(table.state, table.nextAttemptAt),
    check('outbox_events_attempts_nonnegative', sql`${table.attempts} >= 0`),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id'),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    requestId: varchar('request_id', { length: 128 }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ],
);
