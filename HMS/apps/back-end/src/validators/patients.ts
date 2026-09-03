import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod/schema";
import { z } from "zod";

import { PAGINATION } from "../constants/index.ts";
import { patients } from "../database/schema/patients.ts";
import { ISO_DATE_MESSAGE, ISO_DATE_PATTERN } from "./patterns.ts";

export const insertPatientSchema = createInsertSchema(patients, {
	dateOfBirth: (schema) => schema.regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE),
});
export const selectPatientSchema = createSelectSchema(patients);
export const updatePatientSchema = createUpdateSchema(patients, {
	dateOfBirth: (schema) => schema.regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE),
});

const toBoolean = z.preprocess((value) => {
	if (value === true || value === "true" || value === "1") return true;
	if (value === false || value === "false" || value === "0") return false;
	return value;
}, z.boolean());

export const listPatientsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	search: z.string().trim().max(255).optional(),
	includeDeleted: toBoolean.default(false),
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type SelectPatient = z.infer<typeof selectPatientSchema>;
export type UpdatePatient = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
