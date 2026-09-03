import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { appointments } from "./appointments.ts";
import { doctors } from "./doctors.ts";
import { patients } from "./patients.ts";

export const medicalRecords = pgTable(
	"medical_records",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),

		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => doctors.id, { onDelete: "restrict" }),

		/** At most one record per appointment. */
		appointmentId: uuid("appointment_id").references(() => appointments.id, {
			onDelete: "set null",
		}),

		diagnosis: text("diagnosis").notNull(),

		prescription: text("prescription"),

		treatmentPlan: text("treatment_plan"),

		reportFileUrl: varchar("report_file_url", { length: 500 }),

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
		uniqueIndex("medical_records_appointment_unique").on(t.appointmentId),
		index("medical_records_patient_idx").on(t.patientId),
		index("medical_records_doctor_idx").on(t.doctorId),
		index("medical_records_created_at_idx").on(t.createdAt),
	],
);

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type NewMedicalRecord = typeof medicalRecords.$inferInsert;
