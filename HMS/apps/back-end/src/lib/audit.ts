import type { Request } from "express";

import { db } from "../config/db.ts";
import { type AuditLog, auditLogs } from "../database/schema/index.ts";
import { logger } from "./logger.ts";

export interface AuditEntry {
	userId: string;
	action: AuditLog["action"];
	tableName: AuditLog["tableName"];
	recordId: string;
	oldData?: Record<string, unknown> | null;
	newData?: Record<string, unknown> | null;
}

/**
 * Append a row to the audit trail. The trail is best-effort by design: a
 * failed audit write must never fail the request it is describing, so errors
 * are logged and swallowed.
 */
export async function writeAuditLog(
	entry: AuditEntry,
	req?: Request,
): Promise<void> {
	try {
		await db.insert(auditLogs).values({
			userId: entry.userId,
			action: entry.action,
			tableName: entry.tableName,
			recordId: entry.recordId,
			oldData: entry.oldData ?? null,
			newData: entry.newData ?? null,
			ipAddress: req?.ip ?? null,
			userAgent: req?.headers["user-agent"] ?? null,
		});
	} catch (error) {
		logger.warn({ err: error }, "failed to write audit log");
	}
}
