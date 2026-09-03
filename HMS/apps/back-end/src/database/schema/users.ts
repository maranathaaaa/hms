import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { roles } from "./roles.ts";

/**
 * Better Auth `user` model.
 *
 * The property keys on the left are what Better Auth talks to (camelCase);
 * the string on the right is the actual snake_case column. Because the keys
 * already match Better Auth's field names, no `user.fields` mapping is needed
 * in the auth config — only the extra columns are declared there as
 * `additionalFields`.
 */
export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		/** FK to `roles`. Never settable by the client — see `src/auth/index.ts`. */
		roleId: integer("role_id")
			.notNull()
			.references(() => roles.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),

		name: varchar("name", { length: 255 }).notNull(),

		email: varchar("email", { length: 255 }).notNull(),

		emailVerified: boolean("email_verified").notNull().default(false),

		image: varchar("image", { length: 500 }),

		phone: varchar("phone", { length: 20 }),

		/** Soft "disabled" flag. Checked on every request by `requireAuth`. */
		isActive: boolean("is_active").notNull().default(true),

		lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

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
		uniqueIndex("users_email_unique").on(t.email),
		index("users_role_id_idx").on(t.roleId),
		index("users_deleted_at_idx").on(t.deletedAt),
	],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
