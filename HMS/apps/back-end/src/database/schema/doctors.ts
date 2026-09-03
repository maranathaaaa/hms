import { sql } from "drizzle-orm";
import {
	check,
	index,
	numeric,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users.ts";

/** Clinical profile attached 1:1 to a `users` row whose role is DOCTOR. */
export const doctors = pgTable(
	"doctors",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),

		specialization: varchar("specialization", { length: 150 }).notNull(),

		department: varchar("department", { length: 100 }).notNull(),

		licenseNumber: varchar("license_number", { length: 100 }),

		/** `mode: "string"` keeps the exact decimal — never round money through a float. */
		consultationFee: numeric("consultation_fee", {
			precision: 10,
			scale: 2,
			mode: "string",
		}).notNull(),

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
		uniqueIndex("doctors_user_id_unique").on(t.userId),
		uniqueIndex("doctors_license_number_unique").on(t.licenseNumber),
		index("doctors_department_idx").on(t.department),
		index("doctors_specialization_idx").on(t.specialization),
		check(
			"doctors_consultation_fee_non_negative",
			sql`${t.consultationFee} >= 0`,
		),
	],
);

export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
