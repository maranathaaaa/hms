import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../../config/db.ts";
import { env } from "../../config/env.ts";
import {
	ROLE_DESCRIPTIONS,
	ROLES,
	type RoleName,
} from "../../constants/index.ts";
import { logger } from "../../lib/logger.ts";
import { accounts, doctors, roles, users } from "../schema/index.ts";

/**
 * Bootstrap the hospital system:
 *   1. materialise every role in `ROLES` as a row in `roles`
 *   2. create the first administrator (`SEED_ADMIN_EMAIL`)
 *   3. with `--sample`, also create a doctor and a receptionist for demos
 *
 * Idempotent — safe to re-run. The admin is inserted directly (hash + account
 * row) rather than through `auth.api.signUpEmail`, because the sign-up hook in
 * `src/auth/index.ts` only permits an already-authenticated administrator.
 */

const SAMPLE = process.argv.includes("--sample");

async function upsertRoles(): Promise<Map<RoleName, number>> {
	const ids = new Map<RoleName, number>();

	for (const [name, description] of Object.entries(ROLE_DESCRIPTIONS)) {
		const role = name as RoleName;
		const [existing] = await db
			.select({ id: roles.id })
			.from(roles)
			.where(eq(roles.name, role))
			.limit(1);

		if (existing) {
			ids.set(role, existing.id);
			continue;
		}

		const [inserted] = await db
			.insert(roles)
			.values({ name: role, description })
			.onConflictDoNothing()
			.returning({ id: roles.id });

		if (inserted) {
			ids.set(role, inserted.id);
			continue;
		}

		const [row] = await db
			.select({ id: roles.id })
			.from(roles)
			.where(eq(roles.name, role))
			.limit(1);

		if (!row) throw new Error(`Could not seed role: ${role}`);
		ids.set(role, row.id);
	}

	return ids;
}

async function ensureAccount(
	email: string,
	password: string,
	name: string,
	roleId: number,
): Promise<void> {
	const [existing] = await db
		.select({ id: users.id, roleId: users.roleId })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existing) {
		const [credential] = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(
				and(
					eq(accounts.userId, existing.id),
					eq(accounts.providerId, "credential"),
				),
			)
			.limit(1);

		if (!credential) {
			await db.insert(accounts).values({
				userId: existing.id,
				providerId: "credential",
				accountId: existing.id,
				password: await hashPassword(password),
			});
			logger.info({ email }, "seed: repaired missing credential account");
		} else if (existing.roleId !== roleId) {
			await db.update(users).set({ roleId }).where(eq(users.id, existing.id));
			logger.info({ email }, "seed: corrected role");
		}

		return;
	}

	const passwordHash = await hashPassword(password);

	await db.transaction(async (tx) => {
		const [user] = await tx
			.insert(users)
			.values({
				name,
				email,
				emailVerified: true,
				roleId,
			})
			.returning({ id: users.id });

		if (!user) throw new Error(`Failed to create user: ${email}`);

		await tx.insert(accounts).values({
			userId: user.id,
			providerId: "credential",
			accountId: user.id,
			password: passwordHash,
		});
	});

	logger.info({ email, name }, "seed: account created");
}

async function main(): Promise<void> {
	const roleIds = await upsertRoles();
	logger.info({ roles: roleIds.size }, "seed: roles ready");

	const adminPassword = env.SEED_ADMIN_PASSWORD ?? "AdminPassw0rd!2026";

	await ensureAccount(
		env.SEED_ADMIN_EMAIL,
		adminPassword,
		"Hospital Administrator",
		roleIds.get(ROLES.ADMIN) ?? 0,
	);

	if (SAMPLE) {
		const doctorPassword = "DoctorPassw0rd!2026";
		await ensureAccount(
			"dr.owen@hospital.local",
			doctorPassword,
			"Dr. Amelia Owen",
			roleIds.get(ROLES.DOCTOR) ?? 0,
		);

		await ensureAccount(
			"frontdesk@hospital.local",
			"FrontDeskPassw0rd!2026",
			"Sam Reyes",
			roleIds.get(ROLES.RECEPTIONIST) ?? 0,
		);

		const [doctorUser] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, "dr.owen@hospital.local"))
			.limit(1);

		if (doctorUser) {
			const [existingDoctor] = await db
				.select({ id: doctors.id })
				.from(doctors)
				.where(eq(doctors.userId, doctorUser.id))
				.limit(1);

			if (!existingDoctor) {
				await db.insert(doctors).values({
					userId: doctorUser.id,
					specialization: "General Practice",
					department: "Primary Care",
					licenseNumber: "MED-LIC-2026-0001",
					consultationFee: "80.00",
				});
				logger.info("seed: sample doctor profile created");
			}
		}
	}

	logger.info("seed: complete");
	process.exit(0);
}

main().catch((error) => {
	logger.error({ err: error }, "seed: failed");
	process.exit(1);
});
