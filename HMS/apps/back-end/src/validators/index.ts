import { z } from "zod";

import {
	PAGINATION,
	PASSWORD,
	ROLE_VALUES,
	ROLES,
} from "../constants/index.ts";
import { doctorProfileSchema } from "./doctors.ts";

export * from "./accounts.ts";
export * from "./appointments.ts";
export * from "./audit-logs.ts";
export * from "./bills.ts";
export * from "./doctors.ts";
export * from "./medical-records.ts";
export * from "./patients.ts";
export * from "./patterns.ts";
export * from "./roles.ts";
export * from "./sessions.ts";
export * from "./users.ts";
export * from "./verifications.ts";

const toBoolean = z.preprocess((value) => {
	if (value === true || value === "true" || value === "1") return true;
	if (value === false || value === "false" || value === "0") return false;
	return value;
}, z.boolean());

export const adminCreateUserSchema = z
	.object({
		name: z.string().trim().min(1).max(255),
		email: z.string().trim().toLowerCase().max(255),
		password: z.string().min(PASSWORD.MIN_LENGTH).max(PASSWORD.MAX_LENGTH),
		role: z.enum(ROLE_VALUES),
		phone: z.string().trim().max(20).optional(),
		image: z.string().trim().max(500).optional(),
		emailVerified: z.boolean().optional(),
		doctorProfile: doctorProfileSchema.optional(),
	})
	.refine((value) => value.role !== ROLES.DOCTOR || value.doctorProfile, {
		message: "doctorProfile is required when creating a doctor account",
		path: ["doctorProfile"],
	});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const listUsersQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	search: z.string().trim().max(255).optional(),
	role: z.enum(ROLE_VALUES).optional(),
	isActive: toBoolean.optional(),
	includeDeleted: toBoolean.default(false),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
