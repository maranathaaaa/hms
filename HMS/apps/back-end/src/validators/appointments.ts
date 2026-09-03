import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod/schema";
import { z } from "zod";

import { APPOINTMENT_STATUS_VALUES, PAGINATION } from "../constants/index.ts";
import { appointments } from "../database/schema/appointments.ts";
import {
	ISO_DATE_MESSAGE,
	ISO_DATE_PATTERN,
	TIME_MESSAGE,
	TIME_PATTERN,
	timeOrderGuard,
} from "./patterns.ts";

export const insertAppointmentSchema = createInsertSchema(appointments, {
	appointmentDate: (schema) => schema.regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE),
	startTime: (schema) => schema.regex(TIME_PATTERN, TIME_MESSAGE),
	endTime: (schema) => schema.regex(TIME_PATTERN, TIME_MESSAGE),
}).refine(timeOrderGuard, {
	message: "startTime must be earlier than endTime",
	path: ["endTime"],
});
export const selectAppointmentSchema = createSelectSchema(appointments);
export const updateAppointmentRowSchema = createUpdateSchema(appointments, {
	appointmentDate: (schema) => schema.regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE),
	startTime: (schema) => schema.regex(TIME_PATTERN, TIME_MESSAGE),
	endTime: (schema) => schema.regex(TIME_PATTERN, TIME_MESSAGE),
}).refine(timeOrderGuard, {
	message: "startTime must be earlier than endTime",
	path: ["endTime"],
});

const toBoolean = z.preprocess((value) => {
	if (value === true || value === "true" || value === "1") return true;
	if (value === false || value === "false" || value === "0") return false;
	return value;
}, z.boolean());

/** Client-facing create — `createdBy`, status and timestamps are server-owned. */
export const createAppointmentSchema = z
	.object({
		patientId: z.uuid(),
		doctorId: z.uuid(),
		appointmentDate: z.string().regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE),
		startTime: z.string().regex(TIME_PATTERN, TIME_MESSAGE),
		endTime: z.string().regex(TIME_PATTERN, TIME_MESSAGE),
		reason: z.string().trim().max(2000).optional(),
	})
	.refine(timeOrderGuard, {
		message: "startTime must be earlier than endTime",
		path: ["endTime"],
	});

export const updateAppointmentSchema = z
	.object({
		patientId: z.uuid().optional(),
		doctorId: z.uuid().optional(),
		appointmentDate: z
			.string()
			.regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE)
			.optional(),
		startTime: z.string().regex(TIME_PATTERN, TIME_MESSAGE).optional(),
		endTime: z.string().regex(TIME_PATTERN, TIME_MESSAGE).optional(),
		reason: z.string().trim().max(2000).optional(),
	})
	.refine(timeOrderGuard, {
		message: "startTime must be earlier than endTime",
		path: ["endTime"],
	});

export const listAppointmentsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(PAGINATION.MAX_LIMIT)
		.default(PAGINATION.DEFAULT_LIMIT),
	status: z.enum(APPOINTMENT_STATUS_VALUES).optional(),
	doctorId: z.uuid().optional(),
	patientId: z.uuid().optional(),
	dateFrom: z.string().regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE).optional(),
	dateTo: z.string().regex(ISO_DATE_PATTERN, ISO_DATE_MESSAGE).optional(),
	includeDeleted: toBoolean.default(false),
});

export const cancelAppointmentSchema = z.object({
	cancelledReason: z.string().trim().max(2000).optional(),
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type SelectAppointment = z.infer<typeof selectAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
