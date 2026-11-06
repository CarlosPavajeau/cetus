ALTER TABLE "auth"."user" ADD COLUMN "last_active_organization_id" text;--> statement-breakpoint
ALTER TABLE "auth"."user" ADD CONSTRAINT "user_last_active_organization_id_organization_id_fkey" FOREIGN KEY ("last_active_organization_id") REFERENCES "auth"."organization"("id") ON DELETE SET NULL;--> statement-breakpoint
UPDATE "auth"."user" AS u
SET "last_active_organization_id" = latest."active_organization_id"
FROM (
  SELECT DISTINCT ON (s."user_id") s."user_id", s."active_organization_id"
  FROM "auth"."session" AS s
  JOIN "auth"."member" AS m
    ON m."user_id" = s."user_id" AND m."organization_id" = s."active_organization_id"
  WHERE s."impersonated_by" IS NULL
  ORDER BY s."user_id", s."updated_at" DESC
) AS latest
WHERE u."id" = latest."user_id";
