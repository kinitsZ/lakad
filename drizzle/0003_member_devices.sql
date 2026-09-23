CREATE TABLE "device_links" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"member_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_sessions" (
	"member_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_sessions_member_id_session_token_pk" PRIMARY KEY("member_id","session_token")
);
--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_session_token_sessions_token_fk";
--> statement-breakpoint
DROP INDEX "members_session_idx";--> statement-breakpoint
ALTER TABLE "device_links" ADD CONSTRAINT "device_links_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_session_token_sessions_token_fk" FOREIGN KEY ("session_token") REFERENCES "public"."sessions"("token") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_links_member_idx" ON "device_links" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_sessions_token_idx" ON "member_sessions" USING btree ("session_token");--> statement-breakpoint
-- Carry every existing browser over before the old one-browser-per-member column goes.
INSERT INTO "member_sessions" ("member_id", "session_token", "created_at")
SELECT m."id", m."session_token", m."joined_at"
FROM "members" m
JOIN "sessions" s ON s."token" = m."session_token";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "session_token";