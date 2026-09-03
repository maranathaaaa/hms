import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db } from "../config/db.ts";
import { auditLogs, users } from "../database/schema/index.ts";
import { paginate } from "../utils/index.ts";
import type { ListAuditLogsQuery } from "../validators/index.ts";

export interface AuditLogSummary {
	id: string;
	userId: string;
	actorName: string;
	actorEmail: string;
	action: string;
	tableName: string;
	recordId: string;
	oldData: Record<string, unknown> | null;
	newData: Record<string, unknown> | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
}

const summarySelection = {
	id: auditLogs.id,
	userId: auditLogs.userId,
	actorName: users.name,
	actorEmail: users.email,
	action: auditLogs.action,
	tableName: auditLogs.tableName,
	recordId: auditLogs.recordId,
	oldData: auditLogs.oldData,
	newData: auditLogs.newData,
	ipAddress: auditLogs.ipAddress,
	userAgent: auditLogs.userAgent,
	createdAt: auditLogs.createdAt,
};

/**
 * Audit rows never die, so there is no deleted_at to filter on — the join to
 * users is a plain inner join because a soft-deleted actor still has a row.
 */
export async function listAuditLogs(
	query: ListAuditLogsQuery,
): Promise<import("../types/index.ts").PaginatedResult<AuditLogSummary>> {
	const filters = [
		query.userId ? eq(auditLogs.userId, query.userId) : undefined,
		query.action ? eq(auditLogs.action, query.action) : undefined,
		query.tableName ? eq(auditLogs.tableName, query.tableName) : undefined,
		query.dateFrom
			? gte(sql`${auditLogs.createdAt}::date`, query.dateFrom)
			: undefined,
		query.dateTo
			? lte(sql`${auditLogs.createdAt}::date`, query.dateTo)
			: undefined,
	].filter(Boolean);

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [totals] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(auditLogs)
		.where(where);
	const total = totals?.total ?? 0;

	const rows = await db
		.select(summarySelection)
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.id))
		.where(where)
		.orderBy(desc(auditLogs.createdAt))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return paginate(rows, total, query);
}
