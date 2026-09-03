import {
	index,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

/**
 * Better Auth `verification` model: short-lived tokens for email verification,
 * password reset, email change, OAuth state, etc.
 *
 * Two deliberate deviations from the DML:
 *  - `type` carries a DB-level default, because Better Auth never writes it and
 *    the column is NOT NULL.
 *  - `value` is `text` rather than `varchar(255)`: Better Auth stores a JSON
 *    payload here for the OAuth/state and email-change flows, which overflows
 *    255 characters.
 */
export const verifications = pgTable(
	"verifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		identifier: varchar("identifier", { length: 255 }).notNull(),

		type: varchar("type", { length: 50 }).notNull().default("GENERIC"),

		value: text("value").notNull(),

		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index("verifications_identifier_idx").on(t.identifier),
		index("verifications_expires_at_idx").on(t.expiresAt),
	],
);

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
