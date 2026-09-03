import { sql } from "drizzle-orm";
import {
	check,
	index,
	numeric,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import {
	BILL_STATUS,
	BILL_STATUS_VALUES,
	PAYMENT_METHODS,
} from "../../constants/index.ts";
import { appointments } from "./appointments.ts";
import { patients } from "./patients.ts";

export const bills = pgTable(
	"bills",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "restrict" }),

		appointmentId: uuid("appointment_id").references(() => appointments.id, {
			onDelete: "set null",
		}),

		totalAmount: numeric("total_amount", {
			precision: 10,
			scale: 2,
			mode: "string",
		}).notNull(),

		amountPaid: numeric("amount_paid", {
			precision: 10,
			scale: 2,
			mode: "string",
		})
			.notNull()
			.default("0"),

		status: varchar("status", {
			length: 20,
			enum: BILL_STATUS_VALUES as unknown as [string, ...string[]],
		})
			.notNull()
			.default(BILL_STATUS.PENDING),

		paymentMethod: varchar("payment_method", {
			length: 50,
			enum: PAYMENT_METHODS,
		}),

		invoiceDate: timestamp("invoice_date", { withTimezone: true })
			.notNull()
			.defaultNow(),

		paidAt: timestamp("paid_at", { withTimezone: true }),

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
		uniqueIndex("bills_appointment_unique").on(t.appointmentId),
		index("bills_patient_idx").on(t.patientId),
		index("bills_status_idx").on(t.status),
		index("bills_invoice_date_idx").on(t.invoiceDate),

		check("bills_total_amount_non_negative", sql`${t.totalAmount} >= 0`),
		check("bills_amount_paid_non_negative", sql`${t.amountPaid} >= 0`),
		check(
			"bills_amount_paid_not_over_total",
			sql`${t.amountPaid} <= ${t.totalAmount}`,
		),
	],
);

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
