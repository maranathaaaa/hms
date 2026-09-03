import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users.ts";

/** Better Auth `session` model. */
export const sessions = pgTable(
	"sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		token: varchar("token", { length: 255 }).notNull(),

		ipAddress: varchar("ip_address", { length: 45 }),

		userAgent: text("user_agent"),

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
		uniqueIndex("sessions_token_unique").on(t.token),
		index("sessions_user_id_idx").on(t.userId),
		index("sessions_expires_at_idx").on(t.expiresAt),
	],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
