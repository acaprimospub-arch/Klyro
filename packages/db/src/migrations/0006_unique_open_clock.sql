-- Prevents duplicate open clock-in entries for the same user in the same establishment.
-- The partial index (WHERE clock_out IS NULL) only constrains open entries, so closed entries
-- (clock_out IS NOT NULL) are unrestricted and allow multiple historical records.
CREATE UNIQUE INDEX IF NOT EXISTS unique_open_clock_entry ON "time_entries" ("user_id", "establishment_id") WHERE clock_out IS NULL;
