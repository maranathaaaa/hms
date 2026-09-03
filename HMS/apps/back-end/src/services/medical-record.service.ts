import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Request } from "express";

import { db } from "../config/db.ts";
import { ROLES } from "../constants/index.ts";
import {
	appointments,
	doctors,
	medicalRecords,
	patients,
	users,
} from "../database/schema/index.ts";
import { writeAuditLog } from "../lib/audit.ts";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.ts";
import { paginate } from "../utils/index.ts";
import type {
	CreateMedicalRecordInput,
	ListMedicalRecordsQuery,
	UpdateMedicalRecordInput,
} from "../validators/index.ts";
import { getDoctorByUserId } from "./doctor.service.ts";

export interface MedicalRecordSummary {
	id: string;
	patientId: string;
	doctorId: string;
	appointmentId: string | null;
	diagnosis: string;
	prescription: string | null;
	treatmentPlan: string | null;
	reportFileUrl: string | null;
	createdAt: Date;
	updatedAt: Date;
	patientName: string;
	doctorName: string;
}

const summarySelection = {
	id: medicalRecords.id,
	patientId: medicalRecords.patientId,
	doctorId: medicalRecords.doctorId,
	appointmentId: medicalRecords.appointmentId,
	diagnosis: medicalRecords.diagnosis,
	prescription: medicalRecords.prescription,
	treatmentPlan: medicalRecords.treatmentPlan,
	reportFileUrl: medicalRecords.reportFileUrl,
	createdAt: medicalRecords.createdAt,
	updatedAt: medicalRecords.updatedAt,
	patientName: sql<string>`concat(${patients.firstName}, ' ', ${patients.lastName})`,
	doctorName: users.name,
};

const baseFilters = (includeDeleted: boolean) =>
	includeDeleted ? undefined : isNull(medicalRecords.deletedAt);

export async function listMedicalRecords(
	query: ListMedicalRecordsQuery,
	actor?: { id: string; role: string },
): Promise<import("../types/index.ts").PaginatedResult<MedicalRecordSummary>> {
	const filters = [
		baseFilters(query.includeDeleted),
		query.patientId ? eq(medicalRecords.patientId, query.patientId) : undefined,
		query.doctorId ? eq(medicalRecords.doctorId, query.doctorId) : undefined,
	].filter(Boolean);

	// A DOCTOR only ever sees records they authored.
	if (actor?.role === ROLES.DOCTOR) {
		const profile = await getDoctorByUserId(actor.id);
		filters.push(eq(medicalRecords.doctorId, profile.id));
	}

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [totals] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(medicalRecords)
		.where(where);
	const total = totals?.total ?? 0;

	const rows = await db
		.select(summarySelection)
		.from(medicalRecords)
		.innerJoin(patients, eq(medicalRecords.patientId, patients.id))
		.innerJoin(doctors, eq(medicalRecords.doctorId, doctors.id))
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(where)
		.orderBy(desc(medicalRecords.createdAt))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return paginate(rows, total, query);
}

export async function getMedicalRecordById(
	id: string,
): Promise<MedicalRecordSummary> {
	const [row] = await db
		.select(summarySelection)
		.from(medicalRecords)
		.innerJoin(patients, eq(medicalRecords.patientId, patients.id))
		.innerJoin(doctors, eq(medicalRecords.doctorId, doctors.id))
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(and(eq(medicalRecords.id, id), isNull(medicalRecords.deletedAt)))
		.limit(1);

	if (!row) throw new NotFoundError("Medical record");
	return row;
}

export async function getMedicalRecordOwnerUserId(
	id: string,
): Promise<string | null> {
	const [row] = await db
		.select({ userId: doctors.userId })
		.from(medicalRecords)
		.innerJoin(doctors, eq(medicalRecords.doctorId, doctors.id))
		.where(eq(medicalRecords.id, id))
		.limit(1);

	return row?.userId ?? null;
}

async function resolveDoctorId(
	input: CreateMedicalRecordInput,
	actor: { id: string; role: string },
): Promise<string> {
	if (actor.role === ROLES.DOCTOR) {
		const profile = await getDoctorByUserId(actor.id);
		return profile.id;
	}

	if (input.doctorId) return input.doctorId;

	throw new ForbiddenError(
		"An administrator must specify the doctor for this record",
	);
}

export async function createMedicalRecord(
	input: CreateMedicalRecordInput,
	actor: { id: string; role: string },
	req: Request,
): Promise<MedicalRecordSummary> {
	const doctorId = await resolveDoctorId(input, actor);

	if (input.appointmentId) {
		const [appointment] = await db
			.select({ id: appointments.id, doctorId: appointments.doctorId })
			.from(appointments)
			.where(eq(appointments.id, input.appointmentId))
			.limit(1);

		if (!appointment) throw new NotFoundError("Appointment");

		if (actor.role === ROLES.DOCTOR && appointment.doctorId !== doctorId) {
			throw new ForbiddenError(
				"You can only write records for your own appointments",
			);
		}
	}

	const [row] = await db
		.insert(medicalRecords)
		.values({
			patientId: input.patientId,
			doctorId,
			appointmentId: input.appointmentId,
			diagnosis: input.diagnosis,
			prescription: input.prescription,
			treatmentPlan: input.treatmentPlan,
		})
		.returning({ id: medicalRecords.id });

	if (!row) throw new Error("Failed to create medical record");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "CREATE",
			tableName: "medical_records",
			recordId: row.id,
			newData: {
				patientId: input.patientId,
				doctorId,
				appointmentId: input.appointmentId,
			},
		},
		req,
	);

	return getMedicalRecordById(row.id);
}

export async function updateMedicalRecord(
	id: string,
	input: UpdateMedicalRecordInput,
	actor: { id: string; role: string },
	req: Request,
): Promise<MedicalRecordSummary> {
	const current = await getMedicalRecordById(id);

	if (actor.role === ROLES.DOCTOR) {
		const owner = await getMedicalRecordOwnerUserId(id);
		if (owner !== actor.id) {
			throw new ForbiddenError("You can only edit your own records");
		}
	}

	const [row] = await db
		.update(medicalRecords)
		.set(input)
		.where(and(eq(medicalRecords.id, id), isNull(medicalRecords.deletedAt)))
		.returning({ id: medicalRecords.id });

	if (!row) throw new NotFoundError("Medical record");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "medical_records",
			recordId: id,
			oldData: {
				diagnosis: current.diagnosis,
				prescription: current.prescription,
				treatmentPlan: current.treatmentPlan,
			},
			newData: { ...input },
		},
		req,
	);

	return getMedicalRecordById(id);
}

/** Attach an uploaded report file to a record. */
export async function attachReport(
	id: string,
	reportFileUrl: string,
	actor: { id: string; role: string },
	req: Request,
): Promise<MedicalRecordSummary> {
	const current = await getMedicalRecordById(id);

	if (actor.role === ROLES.DOCTOR) {
		const owner = await getMedicalRecordOwnerUserId(id);
		if (owner !== actor.id) {
			throw new ForbiddenError("You can only edit your own records");
		}
	}

	const [row] = await db
		.update(medicalRecords)
		.set({ reportFileUrl })
		.where(and(eq(medicalRecords.id, id), isNull(medicalRecords.deletedAt)))
		.returning({ id: medicalRecords.id });

	if (!row) throw new NotFoundError("Medical record");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "medical_records",
			recordId: id,
			oldData: { reportFileUrl: current.reportFileUrl },
			newData: { reportFileUrl },
		},
		req,
	);

	return getMedicalRecordById(id);
}

export async function softDeleteMedicalRecord(
	id: string,
	actor: { id: string },
	req: Request,
): Promise<void> {
	const [row] = await db
		.update(medicalRecords)
		.set({ deletedAt: new Date() })
		.where(and(eq(medicalRecords.id, id), isNull(medicalRecords.deletedAt)))
		.returning({ id: medicalRecords.id });

	if (!row) throw new NotFoundError("Medical record");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "DELETE",
			tableName: "medical_records",
			recordId: id,
		},
		req,
	);
}

export async function throwIfDuplicateAppointment(
	appointmentId: string | undefined,
): Promise<void> {
	if (!appointmentId) return;

	const [existing] = await db
		.select({ id: medicalRecords.id })
		.from(medicalRecords)
		.where(
			and(
				eq(medicalRecords.appointmentId, appointmentId),
				isNull(medicalRecords.deletedAt),
			),
		)
		.limit(1);

	if (existing) {
		throw new ConflictError("A record already exists for this appointment");
	}
}
