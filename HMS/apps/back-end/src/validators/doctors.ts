import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod/schema";
import { z } from "zod";

import { PAGINATION } from "../constants/index.ts";
import { doctors } from "../database/schema/doctors.ts";
import { MONEY_MESSAGE, MONEY_PATTERN } from "./patterns.ts";

export const insertDoctorSchema = createInsertSchema(doctors, {
	consultationFee: (schema) => schema.regex(MONEY_PATTERN, MONEY_MESSAGE),
});
export const selectDoctorSchema = createSelectSchema(doctors);
export const updateDoctorSchema = createUpdateSchema(doctors, {
	consultationFee: (schema) => schema.regex(MONEY_PATTERN, MONEY_MESSAGE),
});

const toBoolean = z.preprocess((value) => {
	if (value === true || value === "true" || value === "1") return true;
	if (value === false || value === "false" || value === "0") return false;
	return value;
}, z.boolean());

export const listDoctorsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	search: z.string().trim().max(255).optional(),
	department: z.string().trim().max(100).optional(),
	includeDeleted: toBoolean.default(false),
});

/** Editable clinical profile fields only — identity changes live on the user. */
export const updateDoctorProfileSchema = z
	.object({
		specialization: z.string().trim().min(1).max(150).optional(),
		department: z.string().trim().min(1).max(100).optional(),
		licenseNumber: z.string().trim().max(100).optional(),
		consultationFee: z.string().regex(MONEY_PATTERN, MONEY_MESSAGE).optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: "Provide at least one field to update",
	});

export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type SelectDoctor = z.infer<typeof selectDoctorSchema>;
export type UpdateDoctor = z.infer<typeof updateDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
export type UpdateDoctorProfileInput = z.infer<
	typeof updateDoctorProfileSchema
>;

/** Profile fields required when provisioning a DOCTOR account. */
export const doctorProfileSchema = z.object({
	specialization: z.string().trim().min(1).max(150),
	department: z.string().trim().min(1).max(100),
	licenseNumber: z.string().trim().max(100).optional(),
	consultationFee: z.string().regex(MONEY_PATTERN, MONEY_MESSAGE),
});
export type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;
