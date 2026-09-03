import type { Express, Request, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import {
	APPOINTMENT_STATUS_VALUES,
	AUDIT_ACTIONS,
	BILL_STATUS_VALUES,
	BLOOD_GROUPS,
	GENDERS,
	PAGINATION,
	PASSWORD,
	PAYMENT_METHODS,
	ROLE_VALUES,
} from "../constants/index.ts";
import {
	ISO_DATE_PATTERN,
	MONEY_PATTERN,
	TIME_PATTERN,
} from "../validators/patterns.ts";
import { env, isProduction } from "./env.ts";

/**
 * OpenAPI 3.1 document for the NexaCare API.
 *
 * This file owns everything that is *shared* — enums, entity schemas, envelopes,
 * pagination, reusable parameters/request bodies/responses and the security
 * scheme. Individual operations live next to the code that serves them, as
 * `@openapi` JSDoc blocks in `src/routes/**` (and `src/docs/**` for the routes
 * that are mounted by a third-party handler).
 *
 * Enum values and validation patterns are imported from `src/constants` and
 * `src/validators` so the documentation cannot drift from what the API enforces.
 */

const schemaRef = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** `{ "data": <entity> }` — the envelope every single-resource endpoint returns. */
const envelope = (name: string) => ({
	type: "object",
	required: ["data"],
	properties: { data: schemaRef(name) },
});

/** `{ "data": [...], "meta": {...} }` — the envelope every list endpoint returns. */
const paginated = (name: string, description: string) => ({
	type: "object",
	description,
	required: ["data", "meta"],
	properties: {
		data: { type: "array", items: schemaRef(name) },
		meta: schemaRef("PaginationMeta"),
	},
});

/** Nullable in OpenAPI 3.1 is a type union, not the 3.0 `nullable` keyword. */
const nullable = (type: string, extras: Record<string, unknown> = {}) => ({
	type: [type, "null"],
	...extras,
});

const errorResponse = (
	description: string,
	code: string,
	message: string,
	extra: Record<string, unknown> = {},
) => ({
	description,
	content: {
		"application/json": {
			schema: schemaRef("Error"),
			example: { error: { code, message, ...extra } },
		},
	},
});

const timestamp = { type: "string", format: "date-time" } as const;
const uuid = { type: "string", format: "uuid" } as const;
const money = {
	type: "string",
	pattern: MONEY_PATTERN.source,
	description: "Decimal amount serialised as a string to preserve precision.",
} as const;
const isoDate = {
	type: "string",
	format: "date",
	pattern: ISO_DATE_PATTERN.source,
	description: "Calendar date in `YYYY-MM-DD` form.",
} as const;
const clockTime = {
	type: "string",
	pattern: TIME_PATTERN.source,
	description: "Wall-clock time in `HH:MM` or `HH:MM:SS` form.",
} as const;

// Stable sample identifiers so every example in the document tells one story.
const SAMPLE = {
	user: "3f1a9c2e-6b7d-4c8a-9f21-0d5e8b4a7c31",
	admin: "1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c",
	doctorUser: "6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c",
	doctor: "c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f",
	patient: "9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84",
	appointment: "2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92",
	record: "5d3b7f11-8c62-4a90-b1e4-7f0a2c9d6e38",
	bill: "8e1f0a72-3c4d-4b5e-9a6f-2d7c8b1e0f43",
	auditLog: "0f9e8d7c-6b5a-4938-8271-6e5d4c3b2a19",
	session: "4b8c1d2e-3f4a-4b5c-9d6e-7f8a9b0c1d2e",
} as const;

const EXAMPLE_DOCTOR = {
	id: SAMPLE.doctor,
	userId: SAMPLE.doctorUser,
	name: "Dr. Amara Okafor",
	email: "amara.okafor@nexacare.health",
	specialization: "Cardiology",
	department: "Internal Medicine",
	licenseNumber: "MDCN-2019-44821",
	consultationFee: "150.00",
	isActive: true,
	createdAt: "2026-01-14T09:12:44.000Z",
};

const EXAMPLE_PATIENT = {
	id: SAMPLE.patient,
	firstName: "Ngozi",
	lastName: "Adeyemi",
	dateOfBirth: "1991-04-17",
	gender: "FEMALE",
	contactNumber: "+2348031234567",
	email: "ngozi.adeyemi@example.com",
	address: "12 Bode Thomas Street, Surulere, Lagos",
	bloodGroup: "O+",
	emergencyContactName: "Chidi Adeyemi",
	emergencyContactPhone: "+2348039876543",
	createdAt: "2026-02-02T10:24:05.000Z",
	updatedAt: "2026-02-02T10:24:05.000Z",
	deletedAt: null,
};

const EXAMPLE_APPOINTMENT = {
	id: SAMPLE.appointment,
	patientId: SAMPLE.patient,
	doctorId: SAMPLE.doctor,
	createdBy: SAMPLE.admin,
	appointmentDate: "2026-08-14",
	startTime: "09:30:00",
	endTime: "10:00:00",
	status: "SCHEDULED",
	reason: "Follow-up on elevated blood pressure readings",
	checkedInAt: null,
	completedAt: null,
	cancelledAt: null,
	cancelledReason: null,
	createdAt: "2026-08-03T08:15:22.000Z",
	patientName: "Ngozi Adeyemi",
	doctorName: "Dr. Amara Okafor",
	createdByName: "Tunde Bakare",
};

const EXAMPLE_MEDICAL_RECORD = {
	id: SAMPLE.record,
	patientId: SAMPLE.patient,
	doctorId: SAMPLE.doctor,
	appointmentId: SAMPLE.appointment,
	diagnosis: "Stage 1 hypertension (ICD-10 I10), otherwise unremarkable exam.",
	prescription: "Amlodipine 5 mg once daily for 30 days.",
	treatmentPlan:
		"Low-sodium diet, 30 minutes of walking five days a week, review in six weeks.",
	reportFileUrl: "/uploads/6f1b0c2d-8a4e-4d19-9c37-5b2e1f0a8d64.pdf",
	createdAt: "2026-08-14T10:05:41.000Z",
	updatedAt: "2026-08-14T10:05:41.000Z",
	patientName: "Ngozi Adeyemi",
	doctorName: "Dr. Amara Okafor",
};

const EXAMPLE_BILL = {
	id: SAMPLE.bill,
	patientId: SAMPLE.patient,
	appointmentId: SAMPLE.appointment,
	totalAmount: "150.00",
	amountPaid: "50.00",
	status: "PARTIALLY_PAID",
	paymentMethod: "CARD",
	invoiceDate: "2026-08-14T10:06:00.000Z",
	paidAt: null,
	createdAt: "2026-08-14T10:06:00.000Z",
	patientName: "Ngozi Adeyemi",
};

const EXAMPLE_USER = {
	id: SAMPLE.user,
	name: "Tunde Bakare",
	email: "tunde.bakare@nexacare.health",
	role: "RECEPTIONIST",
	phone: "+2348022223333",
	image: null,
	isActive: true,
	emailVerified: true,
	lastLoginAt: "2026-08-03T07:41:18.000Z",
	createdAt: "2026-01-09T11:02:37.000Z",
};

const EXAMPLE_META = { page: 1, limit: 20, total: 137, totalPages: 7 };

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: "3.1.0",

		info: {
			title: "NexaCare API",
			version: "1.0.0",
			summary: "Hospital Management System API",
			description: [
				"REST API for the NexaCare hospital management system: staff accounts,",
				"patient records, scheduling, clinical documentation and billing.",
				"",
				"## Authentication",
				"",
				"Authentication is handled by [Better Auth](https://better-auth.com) under",
				"`/api/auth`. Signing in sets an `HttpOnly` session cookie",
				"(`hms.session_token`); every subsequent request must be sent with",
				"credentials included (`fetch(..., { credentials: 'include' })`). There is no",
				"API-key or bearer-token scheme — the cookie is the only credential.",
				"",
				"Endpoints documented with the `cookieAuth` security scheme reject anonymous",
				"callers with `401 UNAUTHORIZED`. Endpoints documented with `security: []`",
				"are public.",
				"",
				"## Authorization",
				"",
				"Roles map to a fixed permission matrix (`src/constants`). Each operation",
				"below states the permission it requires and the roles that hold it. A",
				"caller who is authenticated but lacks the permission gets",
				"`403 FORBIDDEN`. Some resources are additionally scoped at row level — a",
				"`DOCTOR` only ever sees their own schedule and the records they authored.",
				"",
				"## Conventions",
				"",
				"- Single resources are wrapped in a `data` envelope: `{ \"data\": { ... } }`.",
				"- Collections return `{ \"data\": [ ... ], \"meta\": { ... } }`, where `meta`",
				"  carries page/limit/total/totalPages.",
				"- Deletions are soft. Deleted rows are hidden unless a list endpoint is",
				"  called with `includeDeleted=true`.",
				"- Money is serialised as a decimal **string** (`\"150.00\"`) so amounts never",
				"  pass through a float.",
				"- Dates are `YYYY-MM-DD`, times are `HH:MM[:SS]`, timestamps are ISO 8601",
				"  with a UTC offset.",
				"- Errors always take the shape",
				"  `{ \"error\": { \"code\": \"...\", \"message\": \"...\", \"details\"?: ... } }`.",
				"",
				"## Rate limits",
				"",
				"All `/api` traffic is limited to 300 requests per 15 minutes per IP.",
				"Authentication routes are limited separately and more tightly (for example",
				"5 sign-in attempts per minute). Exceeding a limit returns `429`.",
			].join("\n"),
			contact: {
				name: "NexaCare Engineering",
				url: "https://nexacare-xppe.onrender.com",
			},
			license: { name: "UNLICENSED", identifier: "UNLICENSED" },
		},

		servers: [
			{
				url: isProduction
					? "https://nexacare-xppe.onrender.com"
					: `http://localhost:${env.PORT}`,
				description: isProduction ? "Production" : "Local development",
			},
		],

		tags: [
			{
				name: "System",
				description: "Liveness and readiness probes. No authentication.",
			},
			{
				name: "Authentication",
				description:
					"Session lifecycle served by Better Auth: sign-in, sign-out, password " +
					"recovery, email verification and session management.",
			},
			{
				name: "Users",
				description:
					"Staff and patient-portal accounts: provisioning, role assignment, " +
					"activation and soft deletion.",
			},
			{
				name: "Doctors",
				description:
					"Clinical profiles attached 1:1 to a user account with the DOCTOR role.",
			},
			{
				name: "Patients",
				description:
					"Patient demographics and contact details. A patient record is " +
					"independent of any user account.",
			},
			{
				name: "Appointments",
				description:
					"Scheduling and the visit lifecycle: SCHEDULED → CHECKED_IN → " +
					"IN_PROGRESS → COMPLETED, with CANCELLED and NO_SHOW as terminal exits.",
			},
			{
				name: "Medical Records",
				description:
					"Clinical documentation: diagnosis, prescription, treatment plan and " +
					"an optional attached report file.",
			},
			{
				name: "Billing",
				description:
					"Invoices and payments. Completing an appointment auto-generates a " +
					"pending bill for the doctor's consultation fee.",
			},
			{
				name: "Uploads",
				description:
					"Medical report attachments. Uploads are PDF or image files up to 5 MB; " +
					"stored files are served statically from `/uploads`.",
			},
			{
				name: "Audit Logs",
				description:
					"Administrative, append-only trail of every mutation and " +
					"authentication event.",
			},
			{
				name: "Reports",
				description:
					"Aggregated operational figures for the dashboard: census, today's " +
					"schedule, revenue and outstanding balances.",
			},
		],

		components: {
			securitySchemes: {
				cookieAuth: {
					type: "apiKey",
					in: "cookie",
					name: "hms.session_token",
					description: [
						"Better Auth session cookie, set by `POST /api/auth/sign-in/email`.",
						"",
						"The cookie is `HttpOnly`, so it cannot be read or set from JavaScript —",
						"browsers attach it automatically as long as the request is made with",
						"credentials included. Sessions last 7 days and are refreshed once a day.",
						"",
						"The session is re-validated against the database on every request: a",
						"deactivated, deleted or role-changed account loses access immediately",
						"rather than when its cookie expires.",
					].join("\n"),
				},
			},

			parameters: {
				IdPathParam: {
					name: "id",
					in: "path",
					required: true,
					description: "UUID of the resource.",
					schema: uuid,
					example: SAMPLE.patient,
				},
				PageParam: {
					name: "page",
					in: "query",
					required: false,
					description: "1-based page number.",
					schema: {
						type: "integer",
						minimum: 1,
						default: PAGINATION.DEFAULT_PAGE,
					},
					example: 1,
				},
				LimitParam: {
					name: "limit",
					in: "query",
					required: false,
					description: `Rows per page (max ${PAGINATION.MAX_LIMIT}).`,
					schema: {
						type: "integer",
						minimum: 1,
						maximum: PAGINATION.MAX_LIMIT,
						default: PAGINATION.DEFAULT_LIMIT,
					},
					example: 20,
				},
				IncludeDeletedParam: {
					name: "includeDeleted",
					in: "query",
					required: false,
					description:
						"Include soft-deleted rows. Accepts `true`/`false` or `1`/`0`.",
					schema: { type: "boolean", default: false },
					example: false,
				},
				DateFromParam: {
					name: "dateFrom",
					in: "query",
					required: false,
					description: "Inclusive lower bound, `YYYY-MM-DD`.",
					schema: isoDate,
					example: "2026-08-01",
				},
				DateToParam: {
					name: "dateTo",
					in: "query",
					required: false,
					description: "Inclusive upper bound, `YYYY-MM-DD`.",
					schema: isoDate,
					example: "2026-08-31",
				},
				PatientIdFilterParam: {
					name: "patientId",
					in: "query",
					required: false,
					description: "Restrict results to one patient.",
					schema: uuid,
					example: SAMPLE.patient,
				},
				DoctorIdFilterParam: {
					name: "doctorId",
					in: "query",
					required: false,
					description: "Restrict results to one doctor.",
					schema: uuid,
					example: SAMPLE.doctor,
				},
			},

			schemas: {
				// ---------------------------------------------------------------- shared
				Error: {
					type: "object",
					description:
						"Every failure in the API is returned in this shape. `code` is stable " +
						"and safe to branch on; `message` is human-readable and may change.",
					required: ["error"],
					properties: {
						error: {
							type: "object",
							required: ["code", "message"],
							properties: {
								code: {
									type: "string",
									description: "Machine-readable error identifier.",
									examples: [
										"UNAUTHORIZED",
										"FORBIDDEN",
										"NOT_FOUND",
										"CONFLICT",
										"VALIDATION_ERROR",
										"DUPLICATE",
										"INVALID_REFERENCE",
										"SLOT_UNAVAILABLE",
										"UPLOAD_ERROR",
										"INTERNAL_ERROR",
									],
								},
								message: { type: "string" },
								details: {
									description:
										"Optional context. Present on validation failures and, outside " +
										"production, on unhandled errors.",
								},
							},
						},
					},
				},

				ValidationError: {
					type: "object",
					description:
						"Returned when `body`, `query` or `path` fails Zod validation. " +
						"`details` lists every issue found, not just the first.",
					required: ["error"],
					properties: {
						error: {
							type: "object",
							required: ["code", "message", "details"],
							properties: {
								code: { type: "string", const: "VALIDATION_ERROR" },
								message: { type: "string", const: "Request validation failed" },
								details: {
									type: "array",
									items: {
										type: "object",
										required: ["path", "code", "message"],
										properties: {
											path: {
												type: "string",
												description:
													"Dotted path to the offending field, prefixed by its source.",
												example: "body.email",
											},
											code: { type: "string", example: "invalid_type" },
											message: { type: "string", example: "Invalid email" },
										},
									},
								},
							},
						},
					},
				},

				PaginationMeta: {
					type: "object",
					description: "Cursorless, offset-based pagination metadata.",
					required: ["page", "limit", "total", "totalPages"],
					properties: {
						page: { type: "integer", minimum: 1, example: 1 },
						limit: { type: "integer", minimum: 1, example: 20 },
						total: {
							type: "integer",
							minimum: 0,
							description: "Total rows matching the filter, across all pages.",
							example: 137,
						},
						totalPages: { type: "integer", minimum: 0, example: 7 },
					},
				},

				// ----------------------------------------------------------------- enums
				RoleName: {
					type: "string",
					enum: ROLE_VALUES,
					description:
						"RBAC role. Determines the permission set the caller holds.",
					example: "RECEPTIONIST",
				},
				AppointmentStatus: {
					type: "string",
					enum: APPOINTMENT_STATUS_VALUES,
					description: "Where the visit currently sits in its lifecycle.",
					example: "SCHEDULED",
				},
				BillStatus: {
					type: "string",
					enum: BILL_STATUS_VALUES,
					description:
						"Derived from the running payment total; not settable directly.",
					example: "PENDING",
				},
				PaymentMethod: {
					type: "string",
					enum: PAYMENT_METHODS,
					example: "CARD",
				},
				Gender: { type: "string", enum: GENDERS, example: "FEMALE" },
				BloodGroup: { type: "string", enum: BLOOD_GROUPS, example: "O+" },
				AuditAction: {
					type: "string",
					enum: AUDIT_ACTIONS,
					example: "UPDATE",
				},

				// -------------------------------------------------------------- entities
				HealthStatus: {
					type: "object",
					required: ["status", "timestamp"],
					properties: {
						status: { type: "string", const: "ok" },
						timestamp: timestamp,
					},
				},

				User: {
					type: "object",
					description:
						"A staff or portal account. Password hashes and soft-delete metadata " +
						"are never exposed.",
					required: [
						"id",
						"name",
						"email",
						"role",
						"isActive",
						"emailVerified",
						"createdAt",
					],
					properties: {
						id: uuid,
						name: { type: "string", maxLength: 255 },
						email: { type: "string", format: "email", maxLength: 255 },
						role: schemaRef("RoleName"),
						phone: nullable("string", { maxLength: 20 }),
						image: nullable("string", { maxLength: 500, format: "uri" }),
						isActive: {
							type: "boolean",
							description:
								"Deactivated accounts keep their data but can no longer sign in.",
						},
						emailVerified: { type: "boolean" },
						lastLoginAt: nullable("string", { format: "date-time" }),
						createdAt: timestamp,
					},
					example: EXAMPLE_USER,
				},

				Doctor: {
					type: "object",
					description:
						"A doctor's clinical profile, joined with the identity fields of the " +
						"user account it belongs to.",
					required: [
						"id",
						"userId",
						"name",
						"email",
						"specialization",
						"department",
						"consultationFee",
						"isActive",
						"createdAt",
					],
					properties: {
						id: { ...uuid, description: "Doctor profile id." },
						userId: { ...uuid, description: "Id of the backing user account." },
						name: { type: "string" },
						email: { type: "string", format: "email" },
						specialization: { type: "string", maxLength: 150 },
						department: { type: "string", maxLength: 100 },
						licenseNumber: nullable("string", { maxLength: 100 }),
						consultationFee: money,
						isActive: { type: "boolean" },
						createdAt: timestamp,
					},
					example: EXAMPLE_DOCTOR,
				},

				Patient: {
					type: "object",
					description: "Demographic and contact record for a patient.",
					required: [
						"id",
						"firstName",
						"lastName",
						"dateOfBirth",
						"gender",
						"contactNumber",
						"createdAt",
						"updatedAt",
					],
					properties: {
						id: uuid,
						firstName: { type: "string", maxLength: 100 },
						lastName: { type: "string", maxLength: 100 },
						dateOfBirth: isoDate,
						gender: schemaRef("Gender"),
						contactNumber: { type: "string", maxLength: 20 },
						email: nullable("string", { format: "email", maxLength: 255 }),
						address: nullable("string"),
						bloodGroup: {
							oneOf: [schemaRef("BloodGroup"), { type: "null" }],
						},
						emergencyContactName: nullable("string", { maxLength: 100 }),
						emergencyContactPhone: nullable("string", { maxLength: 20 }),
						createdAt: timestamp,
						updatedAt: timestamp,
						deletedAt: nullable("string", {
							format: "date-time",
							description: "Set when the record is soft-deleted.",
						}),
					},
					example: EXAMPLE_PATIENT,
				},

				Appointment: {
					type: "object",
					description:
						"A scheduled visit, denormalised with the patient and doctor names " +
						"so lists render without extra lookups.",
					required: [
						"id",
						"patientId",
						"doctorId",
						"appointmentDate",
						"startTime",
						"endTime",
						"status",
						"createdAt",
						"patientName",
						"doctorName",
					],
					properties: {
						id: uuid,
						patientId: uuid,
						doctorId: uuid,
						createdBy: {
							...nullable("string", { format: "uuid" }),
							description: "User who booked the appointment.",
						},
						appointmentDate: isoDate,
						startTime: clockTime,
						endTime: clockTime,
						status: schemaRef("AppointmentStatus"),
						reason: nullable("string", { maxLength: 2000 }),
						checkedInAt: nullable("string", { format: "date-time" }),
						completedAt: nullable("string", { format: "date-time" }),
						cancelledAt: nullable("string", { format: "date-time" }),
						cancelledReason: nullable("string", { maxLength: 2000 }),
						createdAt: timestamp,
						patientName: { type: "string" },
						doctorName: { type: "string" },
						createdByName: nullable("string"),
					},
					example: EXAMPLE_APPOINTMENT,
				},

				MedicalRecord: {
					type: "object",
					description:
						"Clinical note for a patient, optionally tied to the appointment it " +
						"came out of. At most one record may reference a given appointment.",
					required: [
						"id",
						"patientId",
						"doctorId",
						"diagnosis",
						"createdAt",
						"updatedAt",
						"patientName",
						"doctorName",
					],
					properties: {
						id: uuid,
						patientId: uuid,
						doctorId: uuid,
						appointmentId: nullable("string", { format: "uuid" }),
						diagnosis: { type: "string", minLength: 1, maxLength: 10000 },
						prescription: nullable("string", { maxLength: 10000 }),
						treatmentPlan: nullable("string", { maxLength: 10000 }),
						reportFileUrl: {
							...nullable("string", { maxLength: 500 }),
							description:
								"Path to the attached report, servable from `/uploads`.",
						},
						createdAt: timestamp,
						updatedAt: timestamp,
						patientName: { type: "string" },
						doctorName: { type: "string" },
					},
					example: EXAMPLE_MEDICAL_RECORD,
				},

				Bill: {
					type: "object",
					description:
						"An invoice against a patient, optionally linked 1:1 to an " +
						"appointment.",
					required: [
						"id",
						"patientId",
						"totalAmount",
						"amountPaid",
						"status",
						"invoiceDate",
						"createdAt",
						"patientName",
					],
					properties: {
						id: uuid,
						patientId: uuid,
						appointmentId: nullable("string", { format: "uuid" }),
						totalAmount: money,
						amountPaid: {
							...money,
							description:
								"Running total of payments received. Never exceeds `totalAmount`.",
						},
						status: schemaRef("BillStatus"),
						paymentMethod: {
							oneOf: [schemaRef("PaymentMethod"), { type: "null" }],
							description: "Method used for the most recent payment.",
						},
						invoiceDate: timestamp,
						paidAt: {
							...nullable("string", { format: "date-time" }),
							description: "Set when the bill becomes fully PAID.",
						},
						createdAt: timestamp,
						patientName: { type: "string" },
					},
					example: EXAMPLE_BILL,
				},

				AuditLog: {
					type: "object",
					description:
						"One immutable audit entry. `oldData`/`newData` hold only the fields " +
						"the operation touched.",
					required: [
						"id",
						"userId",
						"actorName",
						"actorEmail",
						"action",
						"tableName",
						"recordId",
						"createdAt",
					],
					properties: {
						id: uuid,
						userId: { ...uuid, description: "Actor who performed the action." },
						actorName: { type: "string" },
						actorEmail: { type: "string", format: "email" },
						action: schemaRef("AuditAction"),
						tableName: {
							type: "string",
							maxLength: 100,
							description: "Table the action touched.",
							example: "appointments",
						},
						recordId: { ...uuid, description: "Primary key of the row." },
						oldData: nullable("object"),
						newData: nullable("object"),
						ipAddress: nullable("string", { maxLength: 45 }),
						userAgent: nullable("string"),
						createdAt: timestamp,
					},
					example: {
						id: SAMPLE.auditLog,
						userId: SAMPLE.admin,
						actorName: "Tunde Bakare",
						actorEmail: "tunde.bakare@nexacare.health",
						action: "UPDATE",
						tableName: "appointments",
						recordId: SAMPLE.appointment,
						oldData: { status: "CHECKED_IN" },
						newData: { status: "IN_PROGRESS" },
						ipAddress: "102.89.34.17",
						userAgent:
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
						createdAt: "2026-08-14T09:58:03.000Z",
					},
				},

				DashboardStats: {
					type: "object",
					description: "Point-in-time operational snapshot for the whole hospital.",
					required: [
						"totalPatients",
						"totalDoctors",
						"todayAppointments",
						"pendingBills",
						"monthlyRevenue",
						"totalOutstanding",
						"todaySchedule",
					],
					properties: {
						totalPatients: {
							type: "integer",
							description: "Patients that have not been soft-deleted.",
						},
						totalDoctors: {
							type: "integer",
							description: "Doctors with a live profile and a live account.",
						},
						todayAppointments: {
							type: "integer",
							description:
								"Appointments today that are still open — CANCELLED, NO_SHOW and " +
								"COMPLETED are excluded.",
						},
						pendingBills: {
							type: "integer",
							description: "Bills in PENDING or PARTIALLY_PAID.",
						},
						monthlyRevenue: {
							...money,
							description: "Payments received since the first of the month.",
						},
						totalOutstanding: {
							...money,
							description: "Unpaid balance across all open bills.",
						},
						todaySchedule: {
							type: "array",
							description:
								"Up to 10 of today's appointments, earliest start time first.",
							items: {
								type: "object",
								required: [
									"id",
									"appointmentDate",
									"startTime",
									"endTime",
									"status",
									"patientName",
									"doctorName",
								],
								properties: {
									id: uuid,
									appointmentDate: isoDate,
									startTime: clockTime,
									endTime: clockTime,
									status: schemaRef("AppointmentStatus"),
									patientName: { type: "string" },
									doctorName: { type: "string" },
								},
							},
						},
					},
					example: {
						totalPatients: 1284,
						totalDoctors: 37,
						todayAppointments: 42,
						pendingBills: 96,
						monthlyRevenue: "184250.00",
						totalOutstanding: "27430.50",
						todaySchedule: [
							{
								id: SAMPLE.appointment,
								appointmentDate: "2026-08-03",
								startTime: "09:30:00",
								endTime: "10:00:00",
								status: "SCHEDULED",
								patientName: "Ngozi Adeyemi",
								doctorName: "Dr. Amara Okafor",
							},
						],
					},
				},

				// ------------------------------------------------------- auth (Better Auth)
				SessionUser: {
					type: "object",
					description: "The signed-in account as Better Auth returns it.",
					required: ["id", "name", "email", "emailVerified"],
					properties: {
						id: uuid,
						name: { type: "string" },
						email: { type: "string", format: "email" },
						emailVerified: { type: "boolean" },
						image: nullable("string", { format: "uri" }),
						phone: nullable("string"),
						roleId: {
							...nullable("integer"),
							description:
								"Numeric FK into the roles table. Use `GET /api/users/{id}` for " +
								"the role name.",
						},
						isActive: { type: "boolean" },
						createdAt: timestamp,
						updatedAt: timestamp,
					},
				},

				Session: {
					type: "object",
					required: ["id", "userId", "expiresAt", "createdAt"],
					properties: {
						id: uuid,
						userId: uuid,
						token: {
							type: "string",
							description: "Session token, mirrored in the session cookie.",
						},
						expiresAt: timestamp,
						ipAddress: nullable("string"),
						userAgent: nullable("string"),
						createdAt: timestamp,
						updatedAt: timestamp,
					},
				},

				SessionResponse: {
					type: "object",
					description:
						"The active session and its user. `null` when no valid session cookie " +
						"was sent.",
					required: ["session", "user"],
					properties: {
						session: schemaRef("Session"),
						user: schemaRef("SessionUser"),
					},
				},

				SignInEmailRequest: {
					type: "object",
					required: ["email", "password"],
					properties: {
						email: { type: "string", format: "email" },
						password: { type: "string", format: "password" },
						rememberMe: {
							type: "boolean",
							default: true,
							description:
								"When false the session cookie becomes a browser-session cookie.",
						},
						callbackURL: {
							type: "string",
							format: "uri",
							description: "Where to redirect after a redirect-based flow.",
						},
					},
				},

				SignInEmailResponse: {
					type: "object",
					description:
						"The session cookie is delivered in the `Set-Cookie` response header; " +
						"the token in the body is for non-browser clients.",
					properties: {
						redirect: { type: "boolean", example: false },
						token: { type: "string" },
						user: schemaRef("SessionUser"),
					},
				},

				SignUpEmailRequest: {
					type: "object",
					required: ["name", "email", "password"],
					properties: {
						name: { type: "string", minLength: 1, maxLength: 255 },
						email: { type: "string", format: "email", maxLength: 255 },
						password: {
							type: "string",
							format: "password",
							minLength: PASSWORD.MIN_LENGTH,
							maxLength: PASSWORD.MAX_LENGTH,
						},
						phone: { type: "string", maxLength: 20 },
						image: { type: "string", format: "uri", maxLength: 500 },
					},
				},

				// ------------------------------------------------------- request payloads
				CreateUserRequest: {
					type: "object",
					description:
						"Administrative account provisioning. The password is hashed by " +
						"Better Auth; `role` is applied server-side and can never be set by " +
						"the account holder.",
					required: ["name", "email", "password", "role"],
					properties: {
						name: { type: "string", minLength: 1, maxLength: 255 },
						email: {
							type: "string",
							format: "email",
							maxLength: 255,
							description: "Lower-cased and trimmed. Must be unique.",
						},
						password: {
							type: "string",
							format: "password",
							minLength: PASSWORD.MIN_LENGTH,
							maxLength: PASSWORD.MAX_LENGTH,
						},
						role: schemaRef("RoleName"),
						phone: { type: "string", maxLength: 20 },
						image: { type: "string", maxLength: 500 },
						emailVerified: {
							type: "boolean",
							default: true,
							description:
								"Provisioned accounts are treated as verified unless told otherwise.",
						},
						doctorProfile: {
							...schemaRef("DoctorProfileInput"),
							description: "Required when `role` is `DOCTOR`, ignored otherwise.",
						},
					},
				},

				DoctorProfileInput: {
					type: "object",
					description: "Clinical profile created alongside a DOCTOR account.",
					required: ["specialization", "department", "consultationFee"],
					properties: {
						specialization: { type: "string", minLength: 1, maxLength: 150 },
						department: { type: "string", minLength: 1, maxLength: 100 },
						licenseNumber: {
							type: "string",
							maxLength: 100,
							description: "Must be unique across doctors when supplied.",
						},
						consultationFee: money,
					},
				},

				AssignRoleRequest: {
					type: "object",
					required: ["role"],
					properties: { role: schemaRef("RoleName") },
				},

				SetUserActiveRequest: {
					type: "object",
					required: ["isActive"],
					properties: {
						isActive: {
							type: "boolean",
							description:
								"Accepts `true`/`false`, `\"true\"`/`\"false\"` or `1`/`0`. " +
								"Deactivating revokes every session the user holds.",
						},
					},
				},

				CreatePatientRequest: {
					type: "object",
					description:
						"Server-managed columns (`id`, `createdAt`, `updatedAt`, `deletedAt`) " +
						"are ignored if supplied.",
					required: [
						"firstName",
						"lastName",
						"dateOfBirth",
						"gender",
						"contactNumber",
					],
					properties: {
						firstName: { type: "string", minLength: 1, maxLength: 100 },
						lastName: { type: "string", minLength: 1, maxLength: 100 },
						dateOfBirth: isoDate,
						gender: schemaRef("Gender"),
						contactNumber: { type: "string", minLength: 1, maxLength: 20 },
						email: {
							type: "string",
							format: "email",
							maxLength: 255,
							description: "Optional, but must be unique across patients.",
						},
						address: { type: "string" },
						bloodGroup: schemaRef("BloodGroup"),
						emergencyContactName: { type: "string", maxLength: 100 },
						emergencyContactPhone: { type: "string", maxLength: 20 },
					},
				},

				UpdatePatientRequest: {
					type: "object",
					description:
						"Partial update — send only the fields that change. Every field is " +
						"optional and validated with the same rules as on create.",
					properties: {
						firstName: { type: "string", minLength: 1, maxLength: 100 },
						lastName: { type: "string", minLength: 1, maxLength: 100 },
						dateOfBirth: isoDate,
						gender: schemaRef("Gender"),
						contactNumber: { type: "string", minLength: 1, maxLength: 20 },
						email: nullable("string", { format: "email", maxLength: 255 }),
						address: nullable("string"),
						bloodGroup: {
							oneOf: [schemaRef("BloodGroup"), { type: "null" }],
						},
						emergencyContactName: nullable("string", { maxLength: 100 }),
						emergencyContactPhone: nullable("string", { maxLength: 20 }),
					},
				},

				UpdateDoctorProfileRequest: {
					type: "object",
					description:
						"Clinical fields only — name, email and phone live on the user " +
						"account. At least one field must be present.",
					minProperties: 1,
					properties: {
						specialization: { type: "string", minLength: 1, maxLength: 150 },
						department: { type: "string", minLength: 1, maxLength: 100 },
						licenseNumber: { type: "string", maxLength: 100 },
						consultationFee: money,
					},
				},

				CreateAppointmentRequest: {
					type: "object",
					description:
						"`status`, `createdBy` and every timestamp are server-owned. " +
						"`startTime` must be earlier than `endTime`, and the slot must not " +
						"start in the past.",
					required: [
						"patientId",
						"doctorId",
						"appointmentDate",
						"startTime",
						"endTime",
					],
					properties: {
						patientId: uuid,
						doctorId: {
							...uuid,
							description: "Doctor **profile** id, not the doctor's user id.",
						},
						appointmentDate: isoDate,
						startTime: clockTime,
						endTime: clockTime,
						reason: { type: "string", maxLength: 2000 },
					},
				},

				UpdateAppointmentRequest: {
					type: "object",
					description:
						"Reschedule or re-assign an open appointment. Status changes go " +
						"through the dedicated transition endpoints instead.",
					properties: {
						patientId: uuid,
						doctorId: uuid,
						appointmentDate: isoDate,
						startTime: clockTime,
						endTime: clockTime,
						reason: { type: "string", maxLength: 2000 },
					},
				},

				CancelAppointmentRequest: {
					type: "object",
					properties: {
						cancelledReason: {
							type: "string",
							maxLength: 2000,
							description: "Free-text reason stored on the appointment.",
						},
					},
				},

				CreateMedicalRecordRequest: {
					type: "object",
					description:
						"When a DOCTOR calls this, `doctorId` is ignored and taken from " +
						"their own profile. An administrator must supply it explicitly.",
					required: ["patientId", "diagnosis"],
					properties: {
						patientId: uuid,
						doctorId: {
							...uuid,
							description:
								"Required for non-DOCTOR callers; ignored for a DOCTOR.",
						},
						appointmentId: {
							...uuid,
							description:
								"Optional link to the visit. At most one record per appointment.",
						},
						diagnosis: { type: "string", minLength: 1, maxLength: 10000 },
						prescription: { type: "string", maxLength: 10000 },
						treatmentPlan: { type: "string", maxLength: 10000 },
					},
				},

				UpdateMedicalRecordRequest: {
					type: "object",
					description:
						"Amend the clinical narrative. At least one field must be present; " +
						"patient, doctor and appointment links are immutable.",
					minProperties: 1,
					properties: {
						diagnosis: { type: "string", minLength: 1, maxLength: 10000 },
						prescription: { type: "string", maxLength: 10000 },
						treatmentPlan: { type: "string", maxLength: 10000 },
					},
				},

				ReportUploadRequest: {
					type: "object",
					required: ["file"],
					properties: {
						file: {
							type: "string",
							format: "binary",
							description:
								"PDF or image (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`), 5 MB max. " +
								"Exactly one file per request.",
							contentMediaType: "application/pdf",
						},
					},
				},

				CreateBillRequest: {
					type: "object",
					description:
						"`amountPaid`, `status` and `invoiceDate` are server-owned: a new " +
						"bill always starts at 0.00 / PENDING.",
					required: ["patientId", "totalAmount"],
					properties: {
						patientId: uuid,
						appointmentId: {
							...uuid,
							description:
								"Optional link to the visit being billed. One bill per appointment.",
						},
						totalAmount: money,
						paymentMethod: schemaRef("PaymentMethod"),
					},
				},

				RecordPaymentRequest: {
					type: "object",
					description:
						"`amount` is the *additional* payment to record, not the new running " +
						"total. It must be greater than zero and must not push the bill past " +
						"its balance.",
					required: ["amount", "paymentMethod"],
					properties: {
						amount: money,
						paymentMethod: schemaRef("PaymentMethod"),
					},
				},

				// ------------------------------------------------------------- envelopes
				UserResponse: envelope("User"),
				DoctorResponse: envelope("Doctor"),
				PatientResponse: envelope("Patient"),
				AppointmentResponse: envelope("Appointment"),
				MedicalRecordResponse: envelope("MedicalRecord"),
				BillResponse: envelope("Bill"),
				DashboardStatsResponse: envelope("DashboardStats"),

				PaginatedUsers: paginated("User", "A page of user accounts."),
				PaginatedDoctors: paginated("Doctor", "A page of doctor profiles."),
				PaginatedPatients: paginated("Patient", "A page of patient records."),
				PaginatedAppointments: paginated(
					"Appointment",
					"A page of appointments, ordered by date then start time.",
				),
				PaginatedMedicalRecords: paginated(
					"MedicalRecord",
					"A page of medical records, newest first.",
				),
				PaginatedBills: paginated("Bill", "A page of bills, newest invoice first."),
				PaginatedAuditLogs: paginated(
					"AuditLog",
					"A page of audit entries, newest first.",
				),
			},

			requestBodies: {
				CreateUser: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("CreateUserRequest"),
							examples: {
								receptionist: {
									summary: "Front-desk account",
									value: {
										name: "Tunde Bakare",
										email: "tunde.bakare@nexacare.health",
										password: "Correct-Horse-Battery-7",
										role: "RECEPTIONIST",
										phone: "+2348022223333",
									},
								},
								doctor: {
									summary: "Doctor account with clinical profile",
									value: {
										name: "Dr. Amara Okafor",
										email: "amara.okafor@nexacare.health",
										password: "Correct-Horse-Battery-7",
										role: "DOCTOR",
										phone: "+2348011112222",
										doctorProfile: {
											specialization: "Cardiology",
											department: "Internal Medicine",
											licenseNumber: "MDCN-2019-44821",
											consultationFee: "150.00",
										},
									},
								},
							},
						},
					},
				},

				AssignRole: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("AssignRoleRequest"),
							examples: {
								promote: {
									summary: "Promote to administrator",
									value: { role: "ADMIN" },
								},
							},
						},
					},
				},

				SetUserActive: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("SetUserActiveRequest"),
							examples: {
								deactivate: {
									summary: "Suspend the account",
									value: { isActive: false },
								},
								reactivate: {
									summary: "Restore access",
									value: { isActive: true },
								},
							},
						},
					},
				},

				CreatePatient: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("CreatePatientRequest"),
							examples: {
								full: {
									summary: "Full registration",
									value: {
										firstName: "Ngozi",
										lastName: "Adeyemi",
										dateOfBirth: "1991-04-17",
										gender: "FEMALE",
										contactNumber: "+2348031234567",
										email: "ngozi.adeyemi@example.com",
										address: "12 Bode Thomas Street, Surulere, Lagos",
										bloodGroup: "O+",
										emergencyContactName: "Chidi Adeyemi",
										emergencyContactPhone: "+2348039876543",
									},
								},
								minimal: {
									summary: "Walk-in — required fields only",
									value: {
										firstName: "Emeka",
										lastName: "Nwosu",
										dateOfBirth: "1978-11-02",
										gender: "MALE",
										contactNumber: "+2348055556666",
									},
								},
							},
						},
					},
				},

				UpdatePatient: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("UpdatePatientRequest"),
							examples: {
								contactChange: {
									summary: "Patient moved and changed phone number",
									value: {
										contactNumber: "+2348070001111",
										address: "45 Awolowo Road, Ikoyi, Lagos",
									},
								},
							},
						},
					},
				},

				UpdateDoctorProfile: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("UpdateDoctorProfileRequest"),
							examples: {
								feeChange: {
									summary: "Raise the consultation fee",
									value: { consultationFee: "175.00" },
								},
								transfer: {
									summary: "Move to another department",
									value: {
										department: "Cardiothoracic Surgery",
										specialization: "Interventional Cardiology",
									},
								},
							},
						},
					},
				},

				CreateAppointment: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("CreateAppointmentRequest"),
							examples: {
								followUp: {
									summary: "30-minute follow-up",
									value: {
										patientId: SAMPLE.patient,
										doctorId: SAMPLE.doctor,
										appointmentDate: "2026-08-14",
										startTime: "09:30",
										endTime: "10:00",
										reason: "Follow-up on elevated blood pressure readings",
									},
								},
							},
						},
					},
				},

				UpdateAppointment: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("UpdateAppointmentRequest"),
							examples: {
								reschedule: {
									summary: "Move the slot to the afternoon",
									value: {
										appointmentDate: "2026-08-15",
										startTime: "14:00",
										endTime: "14:30",
									},
								},
								reassign: {
									summary: "Hand the visit to another doctor",
									value: { doctorId: SAMPLE.doctor },
								},
							},
						},
					},
				},

				CancelAppointment: {
					required: false,
					content: {
						"application/json": {
							schema: schemaRef("CancelAppointmentRequest"),
							examples: {
								withReason: {
									summary: "Patient called ahead",
									value: { cancelledReason: "Patient requested to reschedule" },
								},
								noReason: { summary: "No reason recorded", value: {} },
							},
						},
					},
				},

				CreateMedicalRecord: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("CreateMedicalRecordRequest"),
							examples: {
								byDoctor: {
									summary: "Written by the treating doctor",
									value: {
										patientId: SAMPLE.patient,
										appointmentId: SAMPLE.appointment,
										diagnosis:
											"Stage 1 hypertension (ICD-10 I10), otherwise unremarkable exam.",
										prescription: "Amlodipine 5 mg once daily for 30 days.",
										treatmentPlan:
											"Low-sodium diet, 30 minutes of walking five days a week, review in six weeks.",
									},
								},
								byAdministrator: {
									summary: "Back-filled by an administrator",
									value: {
										patientId: SAMPLE.patient,
										doctorId: SAMPLE.doctor,
										diagnosis: "Seasonal allergic rhinitis.",
									},
								},
							},
						},
					},
				},

				UpdateMedicalRecord: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("UpdateMedicalRecordRequest"),
							examples: {
								amendPrescription: {
									summary: "Adjust the prescription after a lab result",
									value: {
										prescription:
											"Amlodipine 10 mg once daily for 30 days; recheck potassium in 2 weeks.",
									},
								},
							},
						},
					},
				},

				ReportUpload: {
					required: true,
					content: {
						"multipart/form-data": {
							schema: schemaRef("ReportUploadRequest"),
							encoding: {
								file: {
									contentType:
										"application/pdf, image/png, image/jpeg, image/webp",
								},
							},
						},
					},
				},

				CreateBill: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("CreateBillRequest"),
							examples: {
								consultation: {
									summary: "Bill for a consultation",
									value: {
										patientId: SAMPLE.patient,
										appointmentId: SAMPLE.appointment,
										totalAmount: "150.00",
									},
								},
								standalone: {
									summary: "Ad-hoc charge with no appointment",
									value: { patientId: SAMPLE.patient, totalAmount: "42.50" },
								},
							},
						},
					},
				},

				RecordPayment: {
					required: true,
					content: {
						"application/json": {
							schema: schemaRef("RecordPaymentRequest"),
							examples: {
								partial: {
									summary: "Part payment by card",
									value: { amount: "50.00", paymentMethod: "CARD" },
								},
								settleInFull: {
									summary: "Settle the remaining balance in cash",
									value: { amount: "100.00", paymentMethod: "CASH" },
								},
							},
						},
					},
				},
			},

			responses: {
				NoContent: {
					description:
						"Success. The response body is empty — the row was soft-deleted.",
				},
				BadRequest: errorResponse(
					"The request was malformed or the uploaded file was rejected.",
					"UPLOAD_ERROR",
					"Only PDF and image files are allowed",
				),
				Unauthorized: errorResponse(
					"No valid session cookie was sent, or the session has expired or been revoked.",
					"UNAUTHORIZED",
					"You must be signed in to do that",
				),
				Forbidden: errorResponse(
					"The caller is signed in but lacks the permission this operation requires.",
					"FORBIDDEN",
					"Missing permission: patient:write",
				),
				NotFound: errorResponse(
					"No such resource, or it has been soft-deleted.",
					"NOT_FOUND",
					"Resource not found",
				),
				Conflict: errorResponse(
					"The request collides with the current state of the resource.",
					"CONFLICT",
					"A record with these details already exists",
				),
				ValidationFailed: {
					description:
						"One or more fields failed validation, or a foreign key referenced a " +
						"row that does not exist.",
					content: {
						"application/json": {
							schema: schemaRef("ValidationError"),
							examples: {
								fieldErrors: {
									summary: "Field-level validation",
									value: {
										error: {
											code: "VALIDATION_ERROR",
											message: "Request validation failed",
											details: [
												{
													path: "body.email",
													code: "invalid_format",
													message: "Invalid email address",
												},
											],
										},
									},
								},
								invalidReference: {
									summary: "Foreign key does not resolve",
									value: {
										error: {
											code: "INVALID_REFERENCE",
											message: "Referenced record does not exist",
										},
									},
								},
							},
						},
					},
				},
				PayloadTooLarge: errorResponse(
					"The uploaded file exceeded the 5 MB limit.",
					"UPLOAD_ERROR",
					"File exceeds the 5 MB size limit",
				),
				TooManyRequests: errorResponse(
					"Rate limit exceeded. Back off and retry later.",
					"TOO_MANY_REQUESTS",
					"Too many requests, please try again later",
				),
				InternalServerError: errorResponse(
					"Unhandled server error. Outside production the response also carries a stack trace in `details`.",
					"INTERNAL_ERROR",
					"Something went wrong on our end",
				),
			},

			examples: {
				PaginationMetaExample: {
					summary: "Second page of a 137-row result set",
					value: EXAMPLE_META,
				},
			},
		},

		security: [{ cookieAuth: [] }],
	},

	apis: ["./index.ts", "./src/routes/**/*.ts", "./src/docs/**/*.ts"],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
	// Raw document, for client/SDK generation and for validating the spec in CI.
	app.get("/docs.json", (_req: Request, res: Response) => {
		res.json(specs);
	});

	app.use(
		"/docs",
		swaggerUi.serve,
		swaggerUi.setup(specs, {
			customSiteTitle: "NexaCare API reference",
			swaggerOptions: {
				persistAuthorization: true,
				docExpansion: "none",
				defaultModelsExpandDepth: 2,
				tagsSorter: "alpha",
				withCredentials: true,
			},
		}),
	);
}
