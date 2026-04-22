CREATE TABLE "manager_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"establishment_id" uuid NOT NULL,
	"can_edit_planning" boolean DEFAULT true NOT NULL,
	"can_edit_tasks" boolean DEFAULT true NOT NULL,
	"can_edit_staff" boolean DEFAULT false NOT NULL,
	"can_edit_reservations" boolean DEFAULT true NOT NULL,
	"can_edit_leaves" boolean DEFAULT true NOT NULL,
	"can_view_timeclock" boolean DEFAULT true NOT NULL,
	"can_approve_leave_requests" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manager_permissions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "manager_permissions" ADD CONSTRAINT "manager_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_permissions" ADD CONSTRAINT "manager_permissions_establishment_id_establishments_id_fk" FOREIGN KEY ("establishment_id") REFERENCES "public"."establishments"("id") ON DELETE cascade ON UPDATE no action;