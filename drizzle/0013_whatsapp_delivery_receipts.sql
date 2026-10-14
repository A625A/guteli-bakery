CREATE TABLE "whatsapp_delivery_receipts" (
	"provider_message_id" varchar(256) NOT NULL,
	"status" varchar(16) NOT NULL,
	"recipient" varchar(15) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "whatsapp_receipts_identity_pk" PRIMARY KEY("provider_message_id","status","recipient")
);
--> statement-breakpoint
CREATE INDEX "whatsapp_receipts_received_idx" ON "whatsapp_delivery_receipts" USING btree ("received_at");