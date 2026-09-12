CREATE TABLE "image_cleanup_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"cleanup_attempts" integer DEFAULT 0 NOT NULL,
	"last_cleanup_error_code" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_cleanup_jobs_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "image_cleanup_jobs_attempts_nonnegative" CHECK ("image_cleanup_jobs"."cleanup_attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "image_cleanup_jobs_updated_idx" ON "image_cleanup_jobs" USING btree ("updated_at");