ALTER TABLE "submissions" DROP CONSTRAINT "submissions_form_check";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrence" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "registration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_form_check" CHECK ("submissions"."form" in ('contact', 'volunteer', 'newsletter', 'register'));