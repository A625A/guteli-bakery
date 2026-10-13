CREATE TABLE "order_pricing_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_pricing_state" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"current_revision_id" uuid NOT NULL,
	"accepted_revision_id" uuid,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_pricing_revisions" ADD CONSTRAINT "order_pricing_revisions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_pricing_state" ADD CONSTRAINT "order_pricing_state_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_pricing_state" ADD CONSTRAINT "order_pricing_state_current_revision_id_order_pricing_revisions_id_fk" FOREIGN KEY ("current_revision_id") REFERENCES "public"."order_pricing_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_pricing_state" ADD CONSTRAINT "order_pricing_state_accepted_revision_id_order_pricing_revisions_id_fk" FOREIGN KEY ("accepted_revision_id") REFERENCES "public"."order_pricing_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_pricing_revisions_order_idx" ON "order_pricing_revisions" USING btree ("order_id");