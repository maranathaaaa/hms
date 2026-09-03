import { Router } from "express";

import { PERMISSIONS } from "../constants/index.ts";
import {
	requireAuth,
	requirePermission,
	validate,
	validated,
} from "../middleware/index.ts";
import { listAuditLogs } from "../services/audit-log.service.ts";
import {
	type ListAuditLogsQuery,
	listAuditLogsQuerySchema,
} from "../validators/index.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: List audit log entries
 *     description: >
 *       The append-only trail of every mutation and authentication event,
 *       newest first. Each entry records who acted, on which table and row, and
 *       the before/after values for the fields that changed. Audit rows never
 *       die — there is no soft delete and no `includeDeleted` filter.
 *
 *
 *       Narrow by the acting user (`userId`), the `action`, the `tableName`, or
 *       a `createdAt` window via `dateFrom`/`dateTo`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `audit:read` — held by `SUPER_ADMIN` and `ADMIN`.
 *     operationId: listAuditLogs
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: userId
 *         in: query
 *         required: false
 *         description: Return only entries written by this actor.
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *       - name: action
 *         in: query
 *         required: false
 *         description: Return only entries of this kind.
 *         schema:
 *           $ref: '#/components/schemas/AuditAction'
 *         example: UPDATE
 *       - name: tableName
 *         in: query
 *         required: false
 *         description: Return only entries that touched this table.
 *         schema:
 *           type: string
 *           maxLength: 100
 *         example: appointments
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *     responses:
 *       200:
 *         description: A page of audit entries.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedAuditLogs'
 *             example:
 *               data:
 *                 - id: 0f9e8d7c-6b5a-4938-8271-6e5d4c3b2a19
 *                   userId: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                   actorName: Tunde Bakare
 *                   actorEmail: tunde.bakare@nexacare.health
 *                   action: UPDATE
 *                   tableName: appointments
 *                   recordId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                   oldData:
 *                     status: CHECKED_IN
 *                   newData:
 *                     status: IN_PROGRESS
 *                   ipAddress: 102.89.34.17
 *                   userAgent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
 *                   createdAt: '2026-08-14T09:58:03.000Z'
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 8312
 *                 totalPages: 416
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/",
	requirePermission(PERMISSIONS.AUDIT_READ),
	validate({ query: listAuditLogsQuerySchema }),
	async (req, res) => {
		const query = validated<ListAuditLogsQuery>(req, "query");
		res.json(await listAuditLogs(query));
	},
);

export default router;
