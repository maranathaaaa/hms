import { z } from "zod";

import { PAGINATION } from "../constants/index.ts";

const toBoolean = z.preprocess((value) => {
	if (value === true || value === "true" || value === "1") return true;
	if (value === false || value === "false" || value === "0") return false;
	return value;
}, z.boolean());

/**
 * Client-facing record creation. `doctorId` is optional here because a DOCTOR
 * creating a record is identified by their own profile; an ADMIN may supply
 * it explicitly. At most one record per appointment is enforced by the
 * `medical_records_appointment_unique` index.
 */
export const createMedicalRecordSchema = z.object({
	patientId: z.uuid(),
	doctorId: z.uuid().optional(),
	appointmentId: z.uuid().optional(),
	diagnosis: z.string().trim().min(1).max(10000),
	prescription: z.string().trim().max(10000).optional(),
	treatmentPlan: z.string().trim().max(10000).optional(),
});

export const updateMedicalRecordSchema = z
	.object({
		diagnosis: z.string().trim().min(1).max(10000).optional(),
		prescription: z.string().trim().max(10000).optional(),
		treatmentPlan: z.string().trim().max(10000).optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: "Provide at least one field to update",
	});

export const listMedicalRecordsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	patientId: z.uuid().optional(),
	doctorId: z.uuid().optional(),
	includeDeleted: toBoolean.default(false),
});

export type CreateMedicalRecordInput = z.infer<
	typeof createMedicalRecordSchema
>;
export type UpdateMedicalRecordInput = z.infer<
	typeof updateMedicalRecordSchema
>;
export type ListMedicalRecordsQuery = z.infer<
	typeof listMedicalRecordsQuerySchema
>;
