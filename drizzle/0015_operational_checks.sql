CREATE TABLE "operational_checks" (
	"component" varchar(32) PRIMARY KEY NOT NULL,
	"status" varchar(16) NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "operational_checks_component" CHECK ("operational_checks"."component" IN ('whatsapp_worker')),
	CONSTRAINT "operational_checks_status" CHECK ("operational_checks"."status" IN ('ok', 'failed'))
);
