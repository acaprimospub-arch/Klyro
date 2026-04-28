ALTER TABLE "leave_requests" ADD COLUMN "staff_signature" text;
ALTER TABLE "leave_requests" ADD COLUMN "staff_signed_at" timestamp with time zone;
ALTER TABLE "leave_requests" ADD COLUMN "manager_signature" text;
ALTER TABLE "leave_requests" ADD COLUMN "manager_signed_at" timestamp with time zone;
