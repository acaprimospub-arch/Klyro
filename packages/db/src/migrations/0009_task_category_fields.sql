ALTER TABLE "task_categories" ADD COLUMN "color" text NOT NULL DEFAULT '#94A3B8';
ALTER TABLE "tasks" ADD COLUMN "category_id" uuid;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE set null ON UPDATE no action;
