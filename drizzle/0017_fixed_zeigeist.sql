CREATE TABLE "order_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"actor_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"evidence" varchar(32) NOT NULL,
	"note" varchar(160),
	"previous_status" "payment_status" NOT NULL,
	"new_status" "payment_status" NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result_version" integer NOT NULL,
	CONSTRAINT "order_payment_amount_valid" CHECK ("order_payment_events"."amount_minor" >= 0 AND "order_payment_events"."currency" = 'GTQ' AND "order_payment_events"."result_version" > 1),
	CONSTRAINT "order_payment_transition_valid" CHECK (("order_payment_events"."kind" = 'VERIFIED' AND "order_payment_events"."previous_status" IN ('UNPAID', 'FAILED') AND "order_payment_events"."new_status" = 'PAID' AND (("order_payment_events"."payment_method" = 'BANK_TRANSFER' AND "order_payment_events"."evidence" = 'BANK_FUNDS_RECEIVED') OR ("order_payment_events"."payment_method" IN ('CASH_PICKUP', 'CASH_DELIVERY') AND "order_payment_events"."evidence" = 'CASH_COLLECTED'))) OR ("order_payment_events"."kind" = 'REFUNDED' AND "order_payment_events"."previous_status" = 'PAID' AND "order_payment_events"."new_status" = 'REFUNDED' AND "order_payment_events"."evidence" = 'REFUND_RETURNED'))
);
--> statement-breakpoint
ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payment_events" ADD CONSTRAINT "order_payment_events_revision_id_order_pricing_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."order_pricing_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_payment_event_kind_idx" ON "order_payment_events" USING btree ("order_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "order_payment_event_key_idx" ON "order_payment_events" USING btree ("order_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_matches_fulfillment" CHECK ("orders"."payment_method" IS NULL OR "orders"."payment_method" = 'BANK_TRANSFER' OR ("orders"."payment_method" = 'CASH_PICKUP' AND "orders"."fulfillment" = 'PICKUP') OR ("orders"."payment_method" = 'CASH_DELIVERY' AND "orders"."fulfillment" = 'DELIVERY'));
--> statement-breakpoint
CREATE FUNCTION reject_payment_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Manual payment evidence is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER order_payment_events_immutable
BEFORE UPDATE OR DELETE ON order_payment_events
FOR EACH ROW EXECUTE FUNCTION reject_payment_event_mutation();
