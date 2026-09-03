import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type { Request } from "express";

import { db } from "../config/db.ts";
import { BILL_STATUS } from "../constants/index.ts";
import { bills, patients } from "../database/schema/index.ts";
import { writeAuditLog } from "../lib/audit.ts";
import { ConflictError, NotFoundError } from "../lib/errors.ts";
import { paginate } from "../utils/index.ts";
import type {
	CreateBillInput,
	ListBillsQuery,
	RecordPaymentInput,
} from "../validators/index.ts";

export interface BillSummary {
	id: string;
	patientId: string;
	appointmentId: string | null;
	totalAmount: string;
	amountPaid: string;
	status: string;
	paymentMethod: string | null;
	invoiceDate: Date;
	paidAt: Date | null;
	createdAt: Date;
	patientName: string;
}

const summarySelection = {
	id: bills.id,
	patientId: bills.patientId,
	appointmentId: bills.appointmentId,
	totalAmount: bills.totalAmount,
	amountPaid: bills.amountPaid,
	status: bills.status,
	paymentMethod: bills.paymentMethod,
	invoiceDate: bills.invoiceDate,
	paidAt: bills.paidAt,
	createdAt: bills.createdAt,
	patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
};

const baseFilters = (includeDeleted: boolean) =>
	includeDeleted ? undefined : isNull(bills.deletedAt);

function statusFor(amountPaid: number, totalAmount: number): string {
	if (amountPaid <= 0) return BILL_STATUS.PENDING;
	if (amountPaid < totalAmount) return BILL_STATUS.PARTIALLY_PAID;
	return BILL_STATUS.PAID;
}

export async function listBills(
	query: ListBillsQuery,
): Promise<import("../types/index.ts").PaginatedResult<BillSummary>> {
	const filters = [
		baseFilters(query.includeDeleted),
		query.status ? eq(bills.status, query.status) : undefined,
		query.patientId ? eq(bills.patientId, query.patientId) : undefined,
		query.paymentMethod
			? eq(bills.paymentMethod, query.paymentMethod)
			: undefined,
		query.dateFrom
			? gte(sql`${bills.invoiceDate}::date`, query.dateFrom)
			: undefined,
		query.dateTo
			? lte(sql`${bills.invoiceDate}::date`, query.dateTo)
			: undefined,
	].filter(Boolean);

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [totals] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(bills)
		.where(where);
	const total = totals?.total ?? 0;

	const rows = await db
		.select(summarySelection)
		.from(bills)
		.innerJoin(patients, eq(bills.patientId, patients.id))
		.where(where)
		.orderBy(desc(bills.invoiceDate))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return paginate(rows, total, query);
}

export async function getBillById(id: string): Promise<BillSummary> {
	const [row] = await db
		.select(summarySelection)
		.from(bills)
		.innerJoin(patients, eq(bills.patientId, patients.id))
		.where(and(eq(bills.id, id), isNull(bills.deletedAt)))
		.limit(1);

	if (!row) throw new NotFoundError("Bill");
	return row;
}

export async function createBill(
	input: CreateBillInput,
	actor: { id: string },
	req: Request,
): Promise<BillSummary> {
	if (input.appointmentId) {
		const [existing] = await db
			.select({ id: bills.id })
			.from(bills)
			.where(eq(bills.appointmentId, input.appointmentId))
			.limit(1);

		if (existing) {
			throw new ConflictError("A bill already exists for this appointment");
		}
	}

	const [row] = await db
		.insert(bills)
		.values({
			patientId: input.patientId,
			appointmentId: input.appointmentId,
			totalAmount: input.totalAmount,
			amountPaid: "0",
			status: BILL_STATUS.PENDING,
			paymentMethod: input.paymentMethod,
		})
		.returning({ id: bills.id });

	if (!row) throw new Error("Failed to create bill");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "CREATE",
			tableName: "bills",
			recordId: row.id,
			newData: {
				patientId: input.patientId,
				appointmentId: input.appointmentId,
				totalAmount: input.totalAmount,
			},
		},
		req,
	);

	return getBillById(row.id);
}

/**
 * Record an additional payment against the bill. The bill's status follows the
 * running total: PENDING → PARTIALLY_PAID → PAID.
 */
export async function recordPayment(
	id: string,
	input: RecordPaymentInput,
	actor: { id: string },
	req: Request,
): Promise<BillSummary> {
	const current = await getBillById(id);

	if (
		current.status === BILL_STATUS.CANCELLED ||
		current.status === BILL_STATUS.REFUNDED
	) {
		throw new ConflictError(
			`Cannot record a payment on a ${current.status} bill`,
		);
	}

	if (current.status === BILL_STATUS.PAID) {
		throw new ConflictError("This bill is already fully paid");
	}

	const total = Number(current.totalAmount);
	const paid = Number(current.amountPaid) + Number(input.amount);

	if (paid > total) {
		throw new ConflictError(
			`Payment would exceed the balance of ${total.toFixed(2)}`,
		);
	}

	const status = statusFor(paid, total);

	const [row] = await db
		.update(bills)
		.set({
			amountPaid: paid.toFixed(2),
			status,
			paymentMethod: input.paymentMethod,
			paidAt: status === BILL_STATUS.PAID ? new Date() : null,
		})
		.where(and(eq(bills.id, id), isNull(bills.deletedAt)))
		.returning({ id: bills.id });

	if (!row) throw new NotFoundError("Bill");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "bills",
			recordId: id,
			oldData: { amountPaid: current.amountPaid, status: current.status },
			newData: {
				amountPaid: paid.toFixed(2),
				status,
				paymentMethod: input.paymentMethod,
			},
		},
		req,
	);

	return getBillById(id);
}

export async function voidBill(
	id: string,
	actor: { id: string },
	req: Request,
): Promise<BillSummary> {
	const current = await getBillById(id);

	if (
		current.status === BILL_STATUS.PAID ||
		current.status === BILL_STATUS.REFUNDED
	) {
		throw new ConflictError("Paid or refunded bills cannot be voided");
	}

	const [row] = await db
		.update(bills)
		.set({ status: BILL_STATUS.CANCELLED })
		.where(and(eq(bills.id, id), isNull(bills.deletedAt)))
		.returning({ id: bills.id });

	if (!row) throw new NotFoundError("Bill");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "bills",
			recordId: id,
			oldData: { status: current.status },
			newData: { status: BILL_STATUS.CANCELLED },
		},
		req,
	);

	return getBillById(id);
}
