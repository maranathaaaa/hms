-- -----------------------------------------------------------------------------
-- No-double-booking guard for appointments.
--
-- The EXCLUDE constraint cannot be expressed through Drizzle's builder API, so
-- it is applied here, after the base schema migrations (this file sorts after
-- the timestamped `2026*_*/migration.sql` because of the `9999_` prefix).
--
-- `date + time` yields `timestamp`; `timestamp AT TIME ZONE 'UTC'` yields a
-- deterministic `timestamptz`, so the expression is IMMUTABLE and safe inside
-- an exclusion constraint.
--
-- Violations surface as Postgres error 23P01, which the global error handler
-- maps to HTTP 409 SLOT_UNAVAILABLE.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_double_booking"
  EXCLUDE USING gist (
    "doctor_id" WITH =,
    tstzrange(
      ("appointment_date" + "start_time") AT TIME ZONE 'UTC',
      ("appointment_date" + "end_time") AT TIME ZONE 'UTC'
    ) WITH &&
  );
