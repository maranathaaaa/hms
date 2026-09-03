import { z } from "zod";

import { AUDIT_ACTIONS, PAGINATION } from "../constants/index.ts";
import { ISO_DATE_MESSAGE, ISO_DATE_PATTERN } from "./patterns.ts";

export const listAuditLogsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	userId: z.uuid().optional(),
	action: z.enum(AUDIT_ACTIONS).optional(),
	tableName: z.string().trim().max(100).optional(),
	dateFrom: z.string().regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE).optional(),
	dateTo: z.string().regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE).optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
