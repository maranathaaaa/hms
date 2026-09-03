import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

import { auth, getRoleId } from "../auth/index.ts";
import { db } from "../config/db.ts";
import { ROLES, type RoleName } from "../constants/index.ts";
import { doctors, roles, sessions, users } from "../database/schema/index.ts";
import { writeAuditLog } from "../lib/audit.ts";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.ts";
import type { PaginatedResult } from "../types/index.ts";
import type {
	AdminCreateUserInput,
	ListUsersQuery,
} from "../validators/index.ts";

export interface UserSummary {
	id: string;
	name: string;
	email: string;
	role: RoleName;
	phone: string | null;
	image: string | null;
	isActive: boolean;
	emailVerified: boolean;
	lastLoginAt: Date | null;
	createdAt: Date;
}

const summarySelection = {
	id: users.id,
	name: users.name,
	email: users.email,
	role: roles.name,
	phone: users.phone,
	image: users.image,
	isActive: users.isActive,
	emailVerified: users.emailVerified,
	lastLoginAt: users.lastLoginAt,
	createdAt: users.createdAt,
};

/**
 * Provision a staff account with an explicit role.
 *
 * Password hashing, the `accounts` row and email uniqueness all go through
 * Better Auth so that this account is indistinguishable from a self-signed-up
 * one — we only own the role assignment, which we apply in the same
 * transaction-adjacent step.
 *
 * The caller's `headers` are forwarded to Better Auth so the "sign-up is
 * closed" hook can see the authenticated administrator who is provisioning the
 * account. A DOCTOR role also provisions the 1:1 clinical profile.
 */
export async function createStaffUser(
	input: AdminCreateUserInput,
	actor: { id: string; role: RoleName },
	headers: Headers,
): Promise<UserSummary> {
	// Only a SUPER_ADMIN may mint another SUPER_ADMIN.
	if (input.role === ROLES.SUPER_ADMIN && actor.role !== ROLES.SUPER_ADMIN) {
		throw new ForbiddenError("Only a SUPER_ADMIN can create a SUPER_ADMIN");
	}

	const roleId = await getRoleId(input.role);

	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, input.email))
		.limit(1);

	if (existing.length > 0) {
		throw new ConflictError("A user with that email already exists");
	}

	const created = await auth.api.signUpEmail({
		body: {
			name: input.name,
			email: input.email,
			password: input.password,
			...(input.phone ? { phone: input.phone } : {}),
			...(input.image ? { image: input.image } : {}),
		},
		// Carries the admin's session so the sign-up guard sees an administrator.
		headers,
	});

	const [row] = await db
		.update(users)
		.set({
			roleId,
			emailVerified: input.emailVerified ?? true,
		})
		.where(eq(users.id, created.user.id))
		.returning({ id: users.id });

	if (!row) throw new NotFoundError("User");

	if (input.role === ROLES.DOCTOR && input.doctorProfile) {
		await db.insert(doctors).values({
			userId: created.user.id,
			specialization: input.doctorProfile.specialization,
			department: input.doctorProfile.department,
			licenseNumber: input.doctorProfile.licenseNumber,
			consultationFee: input.doctorProfile.consultationFee,
		});
	}

	await writeAuditLog(
		{
			userId: actor.id,
			action: "CREATE",
			tableName: "users",
			recordId: created.user.id,
			newData: { role: input.role, email: input.email },
		},
		undefined,
	);

	return getUserById(row.id);
}

export async function getUserById(id: string): Promise<UserSummary> {
	const [row] = await db
		.select(summarySelection)
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.id))
		.where(and(eq(users.id, id), isNull(users.deletedAt)))
		.limit(1);

	if (!row) throw new NotFoundError("User");

	return { ...row, role: row.role as RoleName };
}

export async function listUsers(
	query: ListUsersQuery,
): Promise<PaginatedResult<UserSummary>> {
	const filters = [
		query.includeDeleted ? undefined : isNull(users.deletedAt),
		query.role ? eq(roles.name, query.role) : undefined,
		query.isActive === undefined
			? undefined
			: eq(users.isActive, query.isActive),
		query.search
			? or(
					ilike(users.name, `%${query.search}%`),
					ilike(users.email, `%${query.search}%`),
				)
			: undefined,
	].filter(Boolean);

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [totals] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.id))
		.where(where);
	const total = totals?.total ?? 0;

	const data = await db
		.select(summarySelection)
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.id))
		.where(where)
		.orderBy(desc(users.createdAt))
		.limit(query.limit)
		.offset((query.page - 1) * query.limit);

	return {
		data: data.map((row) => ({ ...row, role: row.role as RoleName })),
		meta: {
			page: query.page,
			limit: query.limit,
			total: total ?? 0,
			totalPages: Math.ceil((total ?? 0) / query.limit),
		},
	};
}

export async function assignRole(
	userId: string,
	role: RoleName,
	actor: { id: string; role: RoleName },
): Promise<UserSummary> {
	if (userId === actor.id) {
		throw new ForbiddenError("You cannot change your own role");
	}

	if (
		(role === ROLES.SUPER_ADMIN || actor.role !== ROLES.SUPER_ADMIN) &&
		actor.role !== ROLES.SUPER_ADMIN
	) {
		throw new ForbiddenError("Only a SUPER_ADMIN can grant that role");
	}

	const roleId = await getRoleId(role);

	const [row] = await db
		.update(users)
		.set({ roleId })
		.where(and(eq(users.id, userId), isNull(users.deletedAt)))
		.returning({ id: users.id });

	if (!row) throw new NotFoundError("User");

	// A privilege change must not wait for the old session to expire.
	await db.delete(sessions).where(eq(sessions.userId, userId));

	return getUserById(userId);
}

export async function setUserActive(
	userId: string,
	isActive: boolean,
	actor: { id: string },
): Promise<UserSummary> {
	if (userId === actor.id) {
		throw new ForbiddenError("You cannot deactivate your own account");
	}

	const [row] = await db
		.update(users)
		.set({ isActive })
		.where(and(eq(users.id, userId), isNull(users.deletedAt)))
		.returning({ id: users.id });

	if (!row) throw new NotFoundError("User");

	if (!isActive) {
		await db.delete(sessions).where(eq(sessions.userId, userId));
	}

	return getUserById(userId);
}

/** Soft delete: the audit trail keeps its FK, and the row stops authenticating. */
export async function softDeleteUser(
	userId: string,
	actor: { id: string },
): Promise<void> {
	if (userId === actor.id) {
		throw new ForbiddenError("You cannot delete your own account");
	}

	const [row] = await db
		.update(users)
		.set({ deletedAt: new Date(), isActive: false })
		.where(and(eq(users.id, userId), isNull(users.deletedAt)))
		.returning({ id: users.id });

	if (!row) throw new NotFoundError("User");

	await db.delete(sessions).where(eq(sessions.userId, userId));
}
