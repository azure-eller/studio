CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"invite_id" uuid,
	"client_email" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"brief" jsonb,
	"site_url" text,
	"repo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "briefs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "briefs_status_check" CHECK ("briefs"."status" in ('draft', 'queued', 'provisioning', 'building', 'deploying', 'verifying', 'done', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_id" uuid NOT NULL,
	"step" text,
	"status" text DEFAULT 'running' NOT NULL,
	"log" text DEFAULT '' NOT NULL,
	"error" text,
	"repo_full_name" text,
	"neon_project_id" text,
	"vercel_project_id" text,
	"vercel_deployment_id" text,
	"dns_record_id" text,
	"model_turns" integer,
	"model_cost_usd" real,
	"model_duration_ms" integer,
	"fix_attempts" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"note" text,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_invite_id_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "briefs_status_idx" ON "briefs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "builds_brief_id_idx" ON "builds" USING btree ("brief_id");