import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { AUDIT_ACTIONS } from "../../constants/index.ts";
import { users } from "./users.ts";

export const auditLogs = pgTable(
	"audit_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),

		action: varchar("action", { length: 50, enum: AUDIT_ACTIONS }).notNull(),

		tableName: varchar("table_name", { length: 100 }).notNull(),

		recordId: uuid("record_id").notNull(),

		oldData: jsonb("old_data").$type<Record<string, unknown> | null>(),

		newData: jsonb("new_data").$type<Record<string, unknown> | null>(),

		ipAddress: varchar("ip_address", { length: 45 }),

		userAgent: text("user_agent"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("audit_logs_user_idx").on(t.userId),
		index("audit_logs_record_idx").on(t.tableName, t.recordId),
		index("audit_logs_created_at_idx").on(t.createdAt),
	],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
