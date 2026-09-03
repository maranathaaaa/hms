import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Request } from "express";

import { db } from "../config/db.ts";
import { APPOINTMENT_STATUS, BILL_STATUS, ROLES } from "../constants/index.ts";
import {
	appointments,
	bills,
	doctors,
	patients,
	users,
} from "../database/schema/index.ts";
import { writeAuditLog } from "../lib/audit.ts";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.ts";
import { paginate } from "../utils/index.ts";
import type {
	CancelAppointmentInput,
	CreateAppointmentInput,
	ListAppointmentsQuery,
	UpdateAppointment,
} from "../validators/index.ts";
import { getDoctorByUserId } from "./doctor.service.ts";

export interface AppointmentSummary {
	id: string;
	patientId: string;
	doctorId: string;
	createdBy: string | null;
	appointmentDate: string;
	startTime: string;
	endTime: string;
	status: string;
	reason: string | null;
	checkedInAt: Date | null;
	completedAt: Date | null;
	cancelledAt: Date | null;
	cancelledReason: string | null;
	createdAt: Date;
	patientName: string;
	doctorName: string;
	createdByName: string | null;
}

const createdByUser = alias(users, "created_by_user");

const summarySelection = {
	id: appointments.id,
	patientId: appointments.patientId,
	doctorId: appointments.doctorId,
	createdBy: appointments.createdBy,
	appointmentDate: appointments.appointmentDate,
	startTime: appointments.startTime,
	endTime: appointments.endTime,
	status: appointments.status,
	reason: appointments.reason,
	checkedInAt: appointments.checkedInAt,
	completedAt: appointments.completedAt,
	cancelledAt: appointments.cancelledAt,
	cancelledReason: appointments.cancelledReason,
	createdAt: appointments.createdAt,
	patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
	doctorName: users.name,
	createdByName: createdByUser.name,
};

const baseFilters = (includeDeleted: boolean) =>
	includeDeleted ? undefined : isNull(appointments.deletedAt);

/** "YYYY-MM-DD" and "HH:MM" compare lexicographically — safe for time math. */
function isInPast(date: string, time: string): boolean {
	const now = new Date();
	const nowDate = now.toISOString().slice(0, 10);
	const nowTime = now.toISOString().slice(11, 16);
	return date < nowDate || (date === nowDate && time < nowTime);
}

function assertNotInPast(date: string, time: string): void {
	if (isInPast(date, time)) {
		throw new ConflictError("Cannot schedule an appointment in the past");
	}
}

export async function listAppointments(
	query: ListAppointmentsQuery,
	actor?: { id: string; role: string },
): Promise<import("../types/index.ts").PaginatedResult<AppointmentSummary>> {
	const filters = [
		baseFilters(query.includeDeleted),
		query.status ? eq(appointments.status, query.status) : undefined,
		query.doctorId ? eq(appointments.doctorId, query.doctorId) : undefined,
		query.patientId ? eq(appointments.patientId, query.patientId) : undefined,
		query.dateFrom
			? gte(appointments.appointmentDate, query.dateFrom)
			: undefined,
		query.dateTo ? lte(appointments.appointmentDate, query.dateTo) : undefined,
	].filter(Boolean);

	// A DOCTOR only ever sees their own schedule.
	if (actor?.role === ROLES.DOCTOR) {
		const profile = await getDoctorByUserId(actor.id);
		filters.push(eq(appointments.doctorId, profile.id));
	}

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [totals] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(appointments)
		.where(where);
	const total = totals?.total ?? 0;

	const rows = await db
		.select(summarySelection)
		.from(appointments)
		.innerJoin(patients, eq(appointments.patientId, patients.id))
		.innerJoin(doctors, eq(appointments.doctorId, doctors.id))
		.innerJoin(users, eq(doctors.userId, users.id))
		.leftJoin(createdByUser, eq(appointments.createdBy, createdByUser.id))
		.where(where)
		.orderBy(asc(appointments.appointmentDate), asc(appointments.startTime))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return paginate(rows, total, query);
}

export async function getAppointmentById(
	id: string,
): Promise<AppointmentSummary> {
	const [row] = await db
		.select(summarySelection)
		.from(appointments)
		.innerJoin(patients, eq(appointments.patientId, patients.id))
		.innerJoin(doctors, eq(appointments.doctorId, doctors.id))
		.innerJoin(users, eq(doctors.userId, users.id))
		.leftJoin(createdByUser, eq(appointments.createdBy, createdByUser.id))
		.where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
		.limit(1);

	if (!row) throw new NotFoundError("Appointment");
	return row;
}

/** For row-level authorization: which user account owns the appointment? */
export async function getAppointmentOwnerUserId(
	id: string,
): Promise<string | null> {
	const [row] = await db
		.select({ userId: doctors.userId })
		.from(appointments)
		.innerJoin(doctors, eq(appointments.doctorId, doctors.id))
		.where(eq(appointments.id, id))
		.limit(1);

	return row?.userId ?? null;
}

export async function createAppointment(
	input: CreateAppointmentInput,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	assertNotInPast(input.appointmentDate, input.startTime);

	const [row] = await db
		.insert(appointments)
		.values({
			patientId: input.patientId,
			doctorId: input.doctorId,
			createdBy: actor.id,
			appointmentDate: input.appointmentDate,
			startTime: input.startTime,
			endTime: input.endTime,
			reason: input.reason,
		})
		.returning({ id: appointments.id });

	if (!row) throw new Error("Failed to create appointment");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "CREATE",
			tableName: "appointments",
			recordId: row.id,
			newData: {
				patientId: input.patientId,
				doctorId: input.doctorId,
				appointmentDate: input.appointmentDate,
				startTime: input.startTime,
				endTime: input.endTime,
			},
		},
		req,
	);

	return getAppointmentById(row.id);
}

export async function updateAppointment(
	id: string,
	input: UpdateAppointment,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	const current = await getAppointmentById(id);

	if (
		current.status === APPOINTMENT_STATUS.COMPLETED ||
		current.status === APPOINTMENT_STATUS.CANCELLED
	) {
		throw new ConflictError(
			"A completed or cancelled appointment cannot be rescheduled",
		);
	}

	const date = input.appointmentDate ?? current.appointmentDate;
	const startTime = input.startTime ?? current.startTime;
	assertNotInPast(date, startTime);

	const [row] = await db
		.update(appointments)
		.set(input)
		.where(and(eq(appointments.id, id), isNull(appointments.deletedAt)))
		.returning({ id: appointments.id });

	if (!row) throw new NotFoundError("Appointment");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "appointments",
			recordId: id,
			oldData: {
				appointmentDate: current.appointmentDate,
				startTime: current.startTime,
				endTime: current.endTime,
				doctorId: current.doctorId,
				patientId: current.patientId,
			},
			newData: { ...input },
		},
		req,
	);

	return getAppointmentById(id);
}

async function applyTransition(
	id: string,
	from: string[],
	to: string,
	patch: Partial<typeof appointments.$inferInsert>,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	const current = await getAppointmentById(id);

	if (!from.includes(current.status)) {
		throw new ConflictError(
			`Cannot move a ${current.status} appointment to ${to}`,
		);
	}

	await db
		.update(appointments)
		.set({ status: to, ...patch })
		.where(and(eq(appointments.id, id), isNull(appointments.deletedAt)));

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "appointments",
			recordId: id,
			oldData: { status: current.status },
			newData: { status: to },
		},
		req,
	);

	return getAppointmentById(id);
}

export function checkInAppointment(
	id: string,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	return applyTransition(
		id,
		[APPOINTMENT_STATUS.SCHEDULED],
		APPOINTMENT_STATUS.CHECKED_IN,
		{ checkedInAt: new Date() },
		actor,
		req,
	);
}

export function startAppointment(
	id: string,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	return applyTransition(
		id,
		[APPOINTMENT_STATUS.CHECKED_IN],
		APPOINTMENT_STATUS.IN_PROGRESS,
		{},
		actor,
		req,
	);
}

/**
 * Completing a visit auto-generates a bill for the doctor's consultation fee —
 * unless a bill was already issued for this appointment.
 */
export async function completeAppointment(
	id: string,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	const current = await getAppointmentById(id);

	if (current.status !== APPOINTMENT_STATUS.IN_PROGRESS) {
		throw new ConflictError(`Cannot complete a ${current.status} appointment`);
	}

	const [doctorRow] = await db
		.select({ fee: doctors.consultationFee })
		.from(doctors)
		.where(eq(doctors.id, current.doctorId))
		.limit(1);

	if (!doctorRow) throw new NotFoundError("Doctor");

	await db.transaction(async (tx) => {
		await tx
			.update(appointments)
			.set({ status: APPOINTMENT_STATUS.COMPLETED, completedAt: new Date() })
			.where(
				and(eq(appointments.id, current.id), isNull(appointments.deletedAt)),
			);

		const [existingBill] = await tx
			.select({ id: bills.id })
			.from(bills)
			.where(eq(bills.appointmentId, current.id))
			.limit(1);

		if (!existingBill) {
			await tx.insert(bills).values({
				patientId: current.patientId,
				appointmentId: current.id,
				totalAmount: doctorRow.fee,
				status: BILL_STATUS.PENDING,
			});
		}
	});

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "appointments",
			recordId: current.id,
			oldData: { status: current.status },
			newData: { status: APPOINTMENT_STATUS.COMPLETED },
		},
		req,
	);

	return getAppointmentById(current.id);
}

export function cancelAppointment(
	id: string,
	input: CancelAppointmentInput,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	return applyTransition(
		id,
		[
			APPOINTMENT_STATUS.SCHEDULED,
			APPOINTMENT_STATUS.CHECKED_IN,
			APPOINTMENT_STATUS.IN_PROGRESS,
		],
		APPOINTMENT_STATUS.CANCELLED,
		{ cancelledAt: new Date(), cancelledReason: input.cancelledReason },
		actor,
		req,
	);
}

export function markNoShow(
	id: string,
	actor: { id: string },
	req: Request,
): Promise<AppointmentSummary> {
	return applyTransition(
		id,
		[APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CHECKED_IN],
		APPOINTMENT_STATUS.NO_SHOW,
		{},
		actor,
		req,
	);
}
