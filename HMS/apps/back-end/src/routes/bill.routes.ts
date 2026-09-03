import { Router } from "express";
import type { z } from "zod";

import { PERMISSIONS } from "../constants/index.ts";
import {
	requireAuth,
	requirePermission,
	validate,
	validated,
} from "../middleware/index.ts";
import {
	createBill,
	getBillById,
	listBills,
	recordPayment,
	voidBill,
} from "../services/bill.service.ts";
import { actorFrom, uuidParamSchema } from "../utils/index.ts";
import {
	type CreateBillInput,
	createBillSchema,
	type ListBillsQuery,
	listBillsQuerySchema,
	type RecordPaymentInput,
	recordPaymentSchema,
} from "../validators/index.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/bills:
 *   get:
 *     tags: [Billing]
 *     summary: List bills
 *     description: >
 *       The invoice register, newest first. Rows are denormalised with
 *       `patientName`, and the running `amountPaid`/`status` pair tells you at a
 *       glance what is outstanding.
 *
 *
 *       Filter by `status` for the day's unpaid work, by `patientId` for one
 *       patient's account, by `paymentMethod`, or by an `invoiceDate` window via
 *       `dateFrom`/`dateTo`. Soft-deleted bills are hidden unless
 *       `includeDeleted` is set.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `bill:read` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `RECEPTIONIST` and `ACCOUNTANT`.
 *     operationId: listBills
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         required: false
 *         description: Return only bills in this state.
 *         schema:
 *           $ref: '#/components/schemas/BillStatus'
 *         example: PENDING
 *       - $ref: '#/components/parameters/PatientIdFilterParam'
 *       - name: paymentMethod
 *         in: query
 *         required: false
 *         description: Return only bills settled with this method.
 *         schema:
 *           $ref: '#/components/schemas/PaymentMethod'
 *         example: CARD
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *       - $ref: '#/components/parameters/IncludeDeletedParam'
 *     responses:
 *       200:
 *         description: A page of bills.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedBills'
 *             example:
 *               data:
 *                 - id: 8e1f0a72-3c4d-4b5e-9a6f-2d7c8b1e0f43
 *                   patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                   appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                   totalAmount: '150.00'
 *                   amountPaid: '50.00'
 *                   status: PARTIALLY_PAID
 *                   paymentMethod: CARD
 *                   invoiceDate: '2026-08-14T10:06:00.000Z'
 *                   paidAt: null
 *                   createdAt: '2026-08-14T10:06:00.000Z'
 *                   patientName: Ngozi Adeyemi
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 96
 *                 totalPages: 5
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
	requirePermission(PERMISSIONS.BILL_READ),
	validate({ query: listBillsQuerySchema }),
	async (req, res) => {
		const query = validated<ListBillsQuery>(req, "query");
		res.json(await listBills(query));
	},
);

/**
 * @openapi
 * /api/bills/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: Retrieve a bill
 *     description: >
 *       One invoice with its running totals, status and the method used for the
 *       most recent payment. Soft-deleted bills are reported as `404`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `bill:read` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `RECEPTIONIST` and `ACCOUNTANT`.
 *     operationId: getBillById
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The bill.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BillResponse'
 *             example:
 *               data:
 *                 id: 8e1f0a72-3c4d-4b5e-9a6f-2d7c8b1e0f43
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 totalAmount: '150.00'
 *                 amountPaid: '50.00'
 *                 status: PARTIALLY_PAID
 *                 paymentMethod: CARD
 *                 invoiceDate: '2026-08-14T10:06:00.000Z'
 *                 paidAt: null
 *                 createdAt: '2026-08-14T10:06:00.000Z'
 *                 patientName: Ngozi Adeyemi
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such bill, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Bill not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/:id",
	requirePermission(PERMISSIONS.BILL_READ),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await getBillById(id) });
	},
);

/**
 * @openapi
 * /api/bills:
 *   post:
 *     tags: [Billing]
 *     summary: Create a bill
 *     description: >
 *       Raises an invoice against a patient. `amountPaid`, `status` and
 *       `invoiceDate` are server-owned: a new bill always starts at `0.00` /
 *       `PENDING`. `appointmentId` is optional but at most one bill may exist
 *       per appointment — a second attempt surfaces as `409`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `bill:write` — held by `SUPER_ADMIN`, `ADMIN` and
 *       `ACCOUNTANT`.
 *     operationId: createBill
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreateBill'
 *     responses:
 *       201:
 *         description: The bill was created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BillResponse'
 *             example:
 *               data:
 *                 id: 8e1f0a72-3c4d-4b5e-9a6f-2d7c8b1e0f43
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 totalAmount: '150.00'
 *                 amountPaid: '0.00'
 *                 status: PENDING
 *                 paymentMethod: null
 *                 invoiceDate: '2026-08-14T10:06:00.000Z'
 *                 paidAt: null
 *                 createdAt: '2026-08-14T10:06:00.000Z'
 *                 patientName: Ngozi Adeyemi
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: A bill already exists for this appointment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: A bill already exists for this appointment
 *       422:
 *         description: >
 *           Validation failed — a `totalAmount` that is not a non-negative
 *           amount, a `patientId` that does not resolve, or an `appointmentId`
 *           that is not a UUID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: body.totalAmount
 *                     code: invalid_format
 *                     message: Must be a non-negative amount with up to 2 decimal places
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/",
	requirePermission(PERMISSIONS.BILL_WRITE),
	validate({ body: createBillSchema }),
	async (req, res) => {
		const input = validated<CreateBillInput>(req, "body");
		res
			.status(201)
			.json({ data: await createBill(input, { id: actorFrom(req).id }, req) });
	},
);

/**
 * @openapi
 * /api/bills/{id}/pay:
 *   post:
 *     tags: [Billing]
 *     summary: Record a payment on a bill
 *     description: >
 *       Adds a payment and rolls the bill forward: `PENDING` →
 *       `PARTIALLY_PAID` → `PAID`. `amount` is the *additional* payment to
 *       record, not the new running total — it must be greater than zero and
 *       must not push the bill past its balance. `paidAt` is stamped when the
 *       bill becomes fully `PAID`.
 *
 *
 *       Payments cannot be recorded on a `CANCELLED`, `REFUNDED` or already
 *       `PAID` bill.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `bill:write` — held by `SUPER_ADMIN`, `ADMIN` and
 *       `ACCOUNTANT`.
 *     operationId: recordPayment
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/RecordPayment'
 *     responses:
 *       200:
 *         description: The payment was recorded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BillResponse'
 *             example:
 *               data:
 *                 id: 8e1f0a72-3c4d-4b5e-9a6f-2d7c8b1e0f43
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 totalAmount: '150.00'
 *                 amountPaid: '150.00'
 *                 status: PAID
 *                 paymentMethod: CASH
 *                 invoiceDate: '2026-08-14T10:06:00.000Z'
 *                 paidAt: '2026-08-14T11:02:33.000Z'
 *                 createdAt: '2026-08-14T10:06:00.000Z'
 *                 patientName: Ngozi Adeyemi
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such bill, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Bill not found
 *       409:
 *         description: >
 *           The bill is `CANCELLED`/`REFUNDED`, already fully `PAID`, or the
 *           payment would exceed the outstanding balance.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               alreadyPaid:
 *                 summary: No balance left
 *                 value:
 *                   error:
 *                     code: CONFLICT
 *                     message: This bill is already fully paid
 *               exceedsBalance:
 *                 summary: Over-payment
 *                 value:
 *                   error:
 *                     code: CONFLICT
 *                     message: Payment would exceed the balance of 150.00
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/pay",
	requirePermission(PERMISSIONS.BILL_WRITE),
	validate({ params: uuidParamSchema, body: recordPaymentSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const input = validated<RecordPaymentInput>(req, "body");
		res.json({
			data: await recordPayment(id, input, { id: actorFrom(req).id }, req),
		});
	},
);

/**
 * @openapi
 * /api/bills/{id}/void:
 *   post:
 *     tags: [Billing]
 *     summary: Void a bill
 *     description: >
 *       Cancels an open bill — `PENDING` or `PARTIALLY_PAID` → `CANCELLED`.
 *       Use this for a mistaken or duplicate invoice; a bill that has money on
 *       it keeps its `amountPaid` and `paymentMethod` history for the books.
 *
 *
 *       `PAID` and `REFUNDED` bills cannot be voided — reversing those goes
 *       through a refund workflow instead.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `bill:write` — held by `SUPER_ADMIN`, `ADMIN` and
 *       `ACCOUNTANT`.
 *     operationId: voidBill
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The bill was voided.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BillResponse'
 *             example:
 *               data:
 *                 id: 8e1f0a72-3c4d-4b5e-9a6f-2d7c8b1e0f43
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 appointmentId: null
 *                 totalAmount: '42.50'
 *                 amountPaid: '0.00'
 *                 status: CANCELLED
 *                 paymentMethod: null
 *                 invoiceDate: '2026-08-14T10:06:00.000Z'
 *                 paidAt: null
 *                 createdAt: '2026-08-14T10:06:00.000Z'
 *                 patientName: Ngozi Adeyemi
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such bill, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Bill not found
 *       409:
 *         description: The bill is `PAID` or `REFUNDED`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: Paid or refunded bills cannot be voided
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/void",
	requirePermission(PERMISSIONS.BILL_WRITE),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await voidBill(id, { id: actorFrom(req).id }, req) });
	},
);

export default router;
