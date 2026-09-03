import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { Request } from "express";

import { db } from "../config/db.ts";
import { patients } from "../database/schema/index.ts";
import { writeAuditLog } from "../lib/audit.ts";
import { ConflictError, NotFoundError } from "../lib/errors.ts";
import { paginate } from "../utils/index.ts";
import type {
	InsertPatient,
	ListPatientsQuery,
	UpdatePatient,
} from "../validators/index.ts";

export type { Patient } from "../database/schema/index.ts";

const baseFilters = (includeDeleted: boolean) =>
	includeDeleted ? undefined : isNull(patients.deletedAt);

export async function listPatients(
	query: ListPatientsQuery,
): Promise<
	import("../types/index.ts").PaginatedResult<typeof patients.$inferSelect>
> {
	const filters = [
		baseFilters(query.includeDeleted),
		query.search
			? or(
					ilike(patients.firstName, `%${query.search}%`),
					ilike(patients.lastName, `%${query.search}%`),
					ilike(patients.email, `%${query.search}%`),
					ilike(patients.contactNumber, `%${query.search}%`),
				)
			: undefined,
	].filter(Boolean);

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [totals] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(patients)
		.where(where);
	const total = totals?.total ?? 0;

	const data = await db
		.select()
		.from(patients)
		.where(where)
		.orderBy(desc(patients.createdAt))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return paginate(data, total, query);
}

export async function getPatientById(
	id: string,
): Promise<typeof patients.$inferSelect> {
	const [row] = await db
		.select()
		.from(patients)
		.where(and(eq(patients.id, id), isNull(patients.deletedAt)))
		.limit(1);

	if (!row) throw new NotFoundError("Patient");
	return row;
}

export async function createPatient(
	input: InsertPatient,
	actor: { id: string },
	req: Request,
): Promise<typeof patients.$inferSelect> {
	if (input.email) {
		const [existing] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.email, input.email))
			.limit(1);

		if (existing) {
			throw new ConflictError("A patient with that email already exists");
		}
	}

	const [row] = await db.insert(patients).values(input).returning();

	if (!row) throw new Error("Failed to create patient");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "CREATE",
			tableName: "patients",
			recordId: row.id,
			newData: { firstName: row.firstName, lastName: row.lastName },
		},
		req,
	);

	return row;
}

export async function updatePatient(
	id: string,
	input: UpdatePatient,
	actor: { id: string },
	req: Request,
): Promise<typeof patients.$inferSelect> {
	const [existing] = await db
		.select({ email: patients.email })
		.from(patients)
		.where(and(eq(patients.id, id), isNull(patients.deletedAt)))
		.limit(1);

	if (!existing) throw new NotFoundError("Patient");

	if (input.email && input.email !== existing.email) {
		const [dup] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(eq(patients.email, input.email))
			.limit(1);
		if (dup)
			throw new ConflictError("A patient with that email already exists");
	}

	const [row] = await db
		.update(patients)
		.set(input)
		.where(and(eq(patients.id, id), isNull(patients.deletedAt)))
		.returning();

	if (!row) throw new NotFoundError("Patient");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "patients",
			recordId: id,
			oldData: { ...existing },
			newData: { ...input },
		},
		req,
	);

	return row;
}

export async function softDeletePatient(
	id: string,
	actor: { id: string },
	req: Request,
): Promise<void> {
	const [row] = await db
		.update(patients)
		.set({ deletedAt: new Date() })
		.where(and(eq(patients.id, id), isNull(patients.deletedAt)))
		.returning({ id: patients.id });

	if (!row) throw new NotFoundError("Patient");

	await writeAuditLog(
		{
			userId: actor.id,
			action: "DELETE",
			tableName: "patients",
			recordId: id,
		},
		req,
	);
}
