import { z } from "zod";

import {
	BILL_STATUS_VALUES,
	PAGINATION,
	PAYMENT_METHODS,
} from "../constants/index.ts";
import {
	ISO_DATE_MESSAGE,
	ISO_DATE_PATTERN,
	MONEY_MESSAGE,
	MONEY_PATTERN,
} from "./patterns.ts";

const toBoolean = z.preprocess((value) => {
	if (value === true || value === "true" || value === "1") return true;
	if (value === false || value === "false" || value === "0") return false;
	return value;
}, z.boolean());

/** Manual / generated bill. `amountPaid`, status and timestamps are server-owned. */
export const createBillSchema = z.object({
	patientId: z.uuid(),
	appointmentId: z.uuid().optional(),
	totalAmount: z.string().regex(MONEY_PATTERN, MONEY_MESSAGE),
	paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

/** `amount` is the *additional* payment recorded against the bill. */
export const recordPaymentSchema = z.object({
	amount: z
		.string()
		.regex(MONEY_PATTERN, MONEY_MESSAGE)
		.refine((value) => Number(value) > 0, {
			message: "Payment amount must be greater than zero",
		}),
	paymentMethod: z.enum(PAYMENT_METHODS),
});

export const listBillsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	status: z.enum(BILL_STATUS_VALUES).optional(),
	patientId: z.uuid().optional(),
	paymentMethod: z.enum(PAYMENT_METHODS).optional(),
	dateFrom: z.string().regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE).optional(),
	dateTo: z.string().regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE).optional(),
	includeDeleted: toBoolean.default(false),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>;
