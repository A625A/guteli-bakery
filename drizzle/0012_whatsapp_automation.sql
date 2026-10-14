CREATE TABLE "order_whatsapp_consents" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"destination" varchar(15) NOT NULL,
	"consent_version" varchar(40) NOT NULL,
	"consent_text" text NOT NULL,
	"opted_in_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_suppressions" (
	"destination" varchar(15) PRIMARY KEY NOT NULL,
	"revoked_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "dedupe_key" varchar(128);--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "delivery_status" varchar(32) DEFAULT 'QUEUED' NOT NULL;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "recipient" varchar(15);--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "attempt_token" uuid;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "delivery_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_whatsapp_consents" ADD CONSTRAINT "order_whatsapp_consents_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_dedupe_key_idx" ON "outbox_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_provider_message_idx" ON "outbox_events" USING btree ("provider_message_id");