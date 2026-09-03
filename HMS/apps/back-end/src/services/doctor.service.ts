import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { Request } from "express";

import { db } from "../config/db.ts";
import { doctors, users } from "../database/schema/index.ts";
import { writeAuditLog } from "../lib/audit.ts";
import { NotFoundError } from "../lib/errors.ts";
import { paginate } from "../utils/index.ts";
import type {
	ListDoctorsQuery,
	UpdateDoctorProfileInput,
} from "../validators/index.ts";

export interface DoctorSummary {
	id: string;
	userId: string;
	name: string;
	email: string;
	specialization: string;
	department: string;
	licenseNumber: string | null;
	consultationFee: string;
	isActive: boolean;
	createdAt: Date;
}

const summarySelection = {
	id: doctors.id,
	userId: doctors.userId,
	name: users.name,
	email: users.email,
	specialization: doctors.specialization,
	department: doctors.department,
	licenseNumber: doctors.licenseNumber,
	consultationFee: doctors.consultationFee,
	isActive: users.isActive,
	createdAt: doctors.createdAt,
};

const baseFilters = (includeDeleted: boolean) => [
	includeDeleted ? undefined : isNull(doctors.deletedAt),
	includeDeleted ? undefined : isNull(users.deletedAt),
];

function toSummary(row: DoctorSummary): DoctorSummary {
	return { ...row, licenseNumber: row.licenseNumber };
}

export async function listDoctors(
	query: ListDoctorsQuery,
): Promise<import("../types/index.ts").PaginatedResult<DoctorSummary>> {
	const filters = [
		...baseFilters(query.includeDeleted),
		query.department ? eq(doctors.department, query.department) : undefined,
		query.search
			? or(
					ilike(users.name, `%${query.search}%`),
					ilike(doctors.specialization, `%${query.search}%`),
					ilike(doctors.department, `%${query.search}%`),
				)
			: undefined,
	].filter(Boolean);

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [totals] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(doctors)
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(where);
	const total = totals?.total ?? 0;

	const rows = await db
		.select(summarySelection)
		.from(doctors)
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(where)
		.orderBy(desc(doctors.createdAt))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return paginate(rows.map(toSummary), total, query);
}

export async function getDoctorById(id: string): Promise<DoctorSummary> {
	const [row] = await db
		.select(summarySelection)
		.from(doctors)
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(
			and(
				eq(doctors.id, id),
				isNull(doctors.deletedAt),
				isNull(users.deletedAt),
			),
		)
		.limit(1);

	if (!row) throw new NotFoundError("Doctor");
	return toSummary(row);
}

/** Resolve a doctor's profile row by the user id of their account. */
export async function getDoctorByUserId(
	userId: string,
): Promise<DoctorSummary> {
	const [row] = await db
		.select(summarySelection)
		.from(doctors)
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(and(eq(doctors.userId, userId), isNull(doctors.deletedAt)))
		.limit(1);

	if (!row) throw new NotFoundError("Doctor profile");
	return toSummary(row);
}

export async function updateDoctorProfile(
	id: string,
	input: UpdateDoctorProfileInput,
	actor: { id: string; role: string },
	req: Request,
): Promise<DoctorSummary> {
	const [existing] = await db
		.select({ ...summarySelection })
		.from(doctors)
		.innerJoin(users, eq(doctors.userId, users.id))
		.where(and(eq(doctors.id, id), isNull(doctors.deletedAt)))
		.limit(1);

	if (!existing) throw new NotFoundError("Doctor");

	await db
		.update(doctors)
		.set(input)
		.where(and(eq(doctors.id, id), isNull(doctors.deletedAt)));

	await writeAuditLog(
		{
			userId: actor.id,
			action: "UPDATE",
			tableName: "doctors",
			recordId: id,
			oldData: {
				specialization: existing.specialization,
				department: existing.department,
				licenseNumber: existing.licenseNumber,
				consultationFee: existing.consultationFee,
			},
			newData: { ...input },
		},
		req,
	);

	return getDoctorById(id);
}
