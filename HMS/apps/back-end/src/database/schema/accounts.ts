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

export const accounts = pgTable(
	"accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		providerId: varchar("provider", { length: 50 }).notNull(),

		accountId: varchar("provider_account_id", { length: 255 }).notNull(),

		password: varchar("password", { length: 255 }),

		accessToken: text("access_token"),

		refreshToken: text("refresh_token"),

		idToken: text("id_token"),

		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			withTimezone: true,
		}),

		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			withTimezone: true,
		}),

		scope: text("scope"),

		tokenType: varchar("token_type", { length: 50 }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		uniqueIndex("accounts_provider_account_unique").on(
			t.providerId,
			t.accountId,
		),
		index("accounts_user_id_idx").on(t.userId),
	],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
