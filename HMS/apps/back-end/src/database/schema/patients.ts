import {
	date,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { BLOOD_GROUPS, GENDERS } from "../../constants/index.ts";

export const patients = pgTable(
	"patients",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		firstName: varchar("first_name", { length: 100 }).notNull(),

		lastName: varchar("last_name", { length: 100 }).notNull(),

		/** `mode: "string"` — a date-only column must never be dragged through a timezone. */
		dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),

		gender: varchar("gender", { length: 20, enum: GENDERS }).notNull(),

		contactNumber: varchar("contact_number", { length: 20 }).notNull(),

		email: varchar("email", { length: 255 }),

		address: text("address"),

		bloodGroup: varchar("blood_group", { length: 5, enum: BLOOD_GROUPS }),

		emergencyContactName: varchar("emergency_contact_name", { length: 100 }),

		emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),

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
		uniqueIndex("patients_email_unique").on(t.email),
		index("patients_last_name_idx").on(t.lastName),
		index("patients_contact_number_idx").on(t.contactNumber),
		index("patients_deleted_at_idx").on(t.deletedAt),
	],
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
