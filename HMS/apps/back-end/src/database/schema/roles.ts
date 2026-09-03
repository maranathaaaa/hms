import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Lookup table for the RBAC roles. Seeded from `ROLES` in `src/constants`.
 */
export const roles = pgTable("roles", {
	id: serial("id").primaryKey(),

	name: varchar("name", { length: 50 }).notNull().unique(),

	description: text("description"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),

	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
