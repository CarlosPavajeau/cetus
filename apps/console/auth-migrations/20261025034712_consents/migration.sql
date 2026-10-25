CREATE TABLE "auth"."consent" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"document" text NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "consent_user_document_version_key" UNIQUE("user_id","document","version")
);
--> statement-breakpoint
ALTER TABLE "auth"."consent" ADD CONSTRAINT "consent_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;