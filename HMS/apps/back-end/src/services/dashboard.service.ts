import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";

import { db } from "../config/db.ts";
import { APPOINTMENT_STATUS, BILL_STATUS } from "../constants/index.ts";
import {
	appointments,
	bills,
	doctors,
	patients,
	users,
} from "../database/schema/index.ts";

export interface DashboardStats {
	totalPatients: number;
	totalDoctors: number;
	todayAppointments: number;
	pendingBills: number;
	monthlyRevenue: string;
	totalOutstanding: string;
	todaySchedule: Array<{
		id: string;
		appointmentDate: string;
		startTime: string;
		endTime: string;
		status: string;
		patientName: string;
		doctorName: string;
	}>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const [patientCount] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(patients)
		.where(isNull(patients.deletedAt));

	const [doctorCount] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(doctors)
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(and(isNull(doctors.deletedAt), isNull(users.deletedAt)));

	const today = new Date().toISOString().slice(0, 10);

	const [appointmentCount] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(appointments)
		.where(
			and(
				eq(appointments.appointmentDate, today),
				isNull(appointments.deletedAt),
				sql`${appointments.status} NOT IN ('${sql.raw(APPOINTMENT_STATUS.CANCELLED)}', '${sql.raw(APPOINTMENT_STATUS.NO_SHOW)}', '${sql.raw(APPOINTMENT_STATUS.COMPLETED)}')`,
			),
		);

	const [pendingBills] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(bills)
		.where(
			and(
				isNull(bills.deletedAt),
				sql`${bills.status} IN ('${sql.raw(BILL_STATUS.PENDING)}', '${sql.raw(BILL_STATUS.PARTIALLY_PAID)}')`,
			),
		);

	const monthStart = `${today.slice(0, 7)}-01`;

	const [monthlyRevenue] = await db
		.select({
			total: sql<string>`coalesce(sum(${bills.amountPaid}::numeric), 0)::text`,
		})
		.from(bills)
		.where(
			and(isNull(bills.deletedAt), gte(sql`${bills.paidAt}::date`, monthStart)),
		);

	const [outstanding] = await db
		.select({
			total: sql<string>`coalesce(sum(${bills.totalAmount}::numeric - ${bills.amountPaid}::numeric), 0)::text`,
		})
		.from(bills)
		.where(
			and(
				isNull(bills.deletedAt),
				sql`${bills.status} IN ('${sql.raw(BILL_STATUS.PENDING)}', '${sql.raw(BILL_STATUS.PARTIALLY_PAID)}')`,
			),
		);

	const schedule = await db
		.select({
			id: appointments.id,
			appointmentDate: appointments.appointmentDate,
			startTime: appointments.startTime,
			endTime: appointments.endTime,
			status: appointments.status,
			patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
			doctorName: users.name,
		})
		.from(appointments)
		.innerJoin(patients, eq(appointments.patientId, patients.id))
		.innerJoin(doctors, eq(appointments.doctorId, doctors.id))
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(
			and(
				eq(appointments.appointmentDate, today),
				isNull(appointments.deletedAt),
				sql`${appointments.status} NOT IN ('${sql.raw(APPOINTMENT_STATUS.CANCELLED)}', '${sql.raw(APPOINTMENT_STATUS.NO_SHOW)}')`,
			),
		)
		.orderBy(asc(appointments.startTime))
		.limit(10);

	return {
		totalPatients: patientCount?.n ?? 0,
		totalDoctors: doctorCount?.n ?? 0,
		todayAppointments: appointmentCount?.n ?? 0,
		pendingBills: pendingBills?.n ?? 0,
		monthlyRevenue: monthlyRevenue?.total ?? "0",
		totalOutstanding: outstanding?.total ?? "0",
		todaySchedule: schedule,
	};
}
