import { sql } from "drizzle-orm";
import {
	check,
	date,
	index,
	pgTable,
	text,
	time,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import {
	APPOINTMENT_STATUS,
	APPOINTMENT_STATUS_VALUES,
} from "../../constants/index.ts";
import { doctors } from "./doctors.ts";
import { patients } from "./patients.ts";
import { users } from "./users.ts";

export const appointments = pgTable(
	"appointments",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),

		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => doctors.id, { onDelete: "restrict" }),

		createdBy: uuid("created_by").references(() => users.id, {
			onDelete: "set null",
		}),

		appointmentDate: date("appointment_date", { mode: "string" }).notNull(),

		startTime: time("start_time").notNull(),

		endTime: time("end_time").notNull(),

		status: varchar("status", {
			length: 30,
			enum: APPOINTMENT_STATUS_VALUES as unknown as [string, ...string[]],
		})
			.notNull()
			.default(APPOINTMENT_STATUS.SCHEDULED),

		reason: text("reason"),

		checkedInAt: timestamp("checked_in_at", { withTimezone: true }),

		completedAt: timestamp("completed_at", { withTimezone: true }),

		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

		cancelledReason: text("cancelled_reason"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),

		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(t) => [
		index("appointments_doctor_date_idx").on(t.doctorId, t.appointmentDate),
		index("appointments_patient_idx").on(t.patientId),
		index("appointments_status_idx").on(t.status),
		index("appointments_date_idx").on(t.appointmentDate),

		check("appointments_time_order", sql`${t.startTime} < ${t.endTime}`),

		check(
			"appointments_cancelled_has_reason",
			sql`(${t.status} <> 'CANCELLED') OR (${t.cancelledAt} IS NOT NULL)`,
		),
	],
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
