import { Router } from "express";
import type { z } from "zod";

import { PERMISSIONS } from "../constants/index.ts";
import {
	requireAuth,
	requireOwnershipOr,
	requirePermission,
	validate,
	validated,
} from "../middleware/index.ts";
import {
	cancelAppointment,
	checkInAppointment,
	completeAppointment,
	createAppointment,
	getAppointmentById,
	getAppointmentOwnerUserId,
	listAppointments,
	markNoShow,
	startAppointment,
	updateAppointment,
} from "../services/appointment.service.ts";
import { actorFrom, paramId, uuidParamSchema } from "../utils/index.ts";
import {
	type CancelAppointmentInput,
	type CreateAppointmentInput,
	cancelAppointmentSchema,
	createAppointmentSchema,
	type ListAppointmentsQuery,
	listAppointmentsQuerySchema,
	type UpdateAppointment,
	updateAppointmentSchema,
} from "../validators/index.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: List appointments
 *     description: >
 *       The schedule, ordered by date then start time so a page reads like a
 *       diary. Rows are denormalised with `patientName`, `doctorName` and
 *       `createdByName`, so a calendar or day sheet renders without follow-up
 *       lookups.
 *
 *
 *       Combine `dateFrom`/`dateTo` with `doctorId` for a single clinician's
 *       week, or with `status` to pull the day's no-shows. **A `DOCTOR` is always
 *       scoped to their own schedule** — the filter is applied server-side and
 *       cannot be widened by passing another `doctorId`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:read` — held by every role.
 *     operationId: listAppointments
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: status
 *         in: query
 *         required: false
 *         description: Return only appointments in this state.
 *         schema:
 *           $ref: '#/components/schemas/AppointmentStatus'
 *         example: SCHEDULED
 *       - $ref: '#/components/parameters/DoctorIdFilterParam'
 *       - $ref: '#/components/parameters/PatientIdFilterParam'
 *       - $ref: '#/components/parameters/DateFromParam'
 *       - $ref: '#/components/parameters/DateToParam'
 *       - $ref: '#/components/parameters/IncludeDeletedParam'
 *     responses:
 *       200:
 *         description: A page of appointments.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedAppointments'
 *             example:
 *               data:
 *                 - id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                   patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                   doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                   createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                   appointmentDate: '2026-08-14'
 *                   startTime: '09:30:00'
 *                   endTime: '10:00:00'
 *                   status: SCHEDULED
 *                   reason: Follow-up on elevated blood pressure readings
 *                   checkedInAt: null
 *                   completedAt: null
 *                   cancelledAt: null
 *                   cancelledReason: null
 *                   createdAt: '2026-08-03T08:15:22.000Z'
 *                   patientName: Ngozi Adeyemi
 *                   doctorName: Dr. Amara Okafor
 *                   createdByName: Tunde Bakare
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 42
 *                 totalPages: 3
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: The caller is a `DOCTOR` with no clinical profile, so no schedule can be resolved.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Doctor profile not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/",
	requirePermission(PERMISSIONS.APPOINTMENT_READ),
	validate({ query: listAppointmentsQuerySchema }),
	async (req, res) => {
		const query = validated<ListAppointmentsQuery>(req, "query");
		res.json(await listAppointments(query, actorFrom(req)));
	},
);

/**
 * @openapi
 * /api/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Retrieve an appointment
 *     description: >
 *       One appointment with its lifecycle timestamps — when the patient checked
 *       in, when the visit completed, when and why it was cancelled — plus the
 *       patient and doctor names. Soft-deleted appointments are reported as
 *       `404`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:read` — held by every role.
 *     operationId: getAppointmentById
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The appointment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-14'
 *                 startTime: '09:30:00'
 *                 endTime: '10:00:00'
 *                 status: SCHEDULED
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: null
 *                 completedAt: null
 *                 cancelledAt: null
 *                 cancelledReason: null
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such appointment, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/:id",
	requirePermission(PERMISSIONS.APPOINTMENT_READ),
	validate({ params: uuidParamSchema }),
	requireOwnershipOr(PERMISSIONS.APPOINTMENT_READ, async (req) =>
		getAppointmentOwnerUserId(paramId(req)),
	),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await getAppointmentById(id) });
	},
);

/**
 * @openapi
 * /api/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Book an appointment
 *     description: >
 *       Reserves a slot for a patient with a doctor. The new appointment starts
 *       as `SCHEDULED`; status, `createdBy` and every timestamp are server-owned.
 *
 *
 *       Two rules are enforced beyond field validation. The slot may not start in
 *       the past, and the database rejects any slot that overlaps an existing
 *       appointment for the same doctor — double-booking is impossible even under
 *       two concurrent requests, and surfaces as `409 SLOT_UNAVAILABLE`.
 *
 *
 *       `doctorId` is the **doctor profile id** from `GET /api/doctors`, not the
 *       doctor's user id.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:write` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `DOCTOR` and `RECEPTIONIST`.
 *     operationId: createAppointment
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreateAppointment'
 *     responses:
 *       201:
 *         description: The appointment was booked.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-14'
 *                 startTime: '09:30:00'
 *                 endTime: '10:00:00'
 *                 status: SCHEDULED
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: null
 *                 completedAt: null
 *                 cancelledAt: null
 *                 cancelledReason: null
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: The slot is in the past, or the doctor is already booked for an overlapping slot.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               inThePast:
 *                 summary: Slot already gone
 *                 value:
 *                   error:
 *                     code: CONFLICT
 *                     message: Cannot schedule an appointment in the past
 *               slotTaken:
 *                 summary: Overlapping booking
 *                 value:
 *                   error:
 *                     code: SLOT_UNAVAILABLE
 *                     message: That doctor already has an appointment overlapping this slot
 *       422:
 *         description: >
 *           Validation failed — a malformed date or time, `startTime` at or after
 *           `endTime`, or a `patientId`/`doctorId` that does not resolve.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             examples:
 *               timeOrder:
 *                 summary: End before start
 *                 value:
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Request validation failed
 *                     details:
 *                       - path: body.endTime
 *                         code: custom
 *                         message: startTime must be earlier than endTime
 *               unknownDoctor:
 *                 summary: Foreign key does not resolve
 *                 value:
 *                   error:
 *                     code: INVALID_REFERENCE
 *                     message: Referenced record does not exist
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/",
	requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
	validate({ body: createAppointmentSchema }),
	async (req, res) => {
		const input = validated<CreateAppointmentInput>(req, "body");
		res
			.status(201)
			.json({ data: await createAppointment(input, actorFrom(req), req) });
	},
);

/**
 * @openapi
 * /api/appointments/{id}:
 *   patch:
 *     tags: [Appointments]
 *     summary: Reschedule or amend an appointment
 *     description: >
 *       Moves the slot, hands the visit to another doctor or patient, or edits
 *       the stated reason. Status is not settable here — use the transition
 *       endpoints (`check-in`, `start`, `complete`, `cancel`, `no-show`) so the
 *       lifecycle rules and their timestamps stay consistent.
 *
 *
 *       A completed or cancelled appointment is closed and cannot be rescheduled.
 *       The new slot must not start in the past and must not overlap another
 *       booking for the same doctor.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:write` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `DOCTOR` and `RECEPTIONIST`.
 *     operationId: updateAppointment
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/UpdateAppointment'
 *     responses:
 *       200:
 *         description: The updated appointment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-15'
 *                 startTime: '14:00:00'
 *                 endTime: '14:30:00'
 *                 status: SCHEDULED
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: null
 *                 completedAt: null
 *                 cancelledAt: null
 *                 cancelledReason: null
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such appointment, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       409:
 *         description: >
 *           The appointment is already completed or cancelled, the new slot is in
 *           the past, or it overlaps another booking for the same doctor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               closed:
 *                 summary: Already finished
 *                 value:
 *                   error:
 *                     code: CONFLICT
 *                     message: A completed or cancelled appointment cannot be rescheduled
 *               slotTaken:
 *                 summary: Overlapping booking
 *                 value:
 *                   error:
 *                     code: SLOT_UNAVAILABLE
 *                     message: That doctor already has an appointment overlapping this slot
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
	"/:id",
	requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
	validate({ params: uuidParamSchema, body: updateAppointmentSchema }),
	requireOwnershipOr(PERMISSIONS.APPOINTMENT_WRITE, async (req) =>
		getAppointmentOwnerUserId(paramId(req)),
	),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const input = validated<UpdateAppointment>(req, "body");
		res.json({ data: await updateAppointment(id, input, actorFrom(req), req) });
	},
);

/**
 * @openapi
 * /api/appointments/{id}/check-in:
 *   post:
 *     tags: [Appointments]
 *     summary: Check a patient in
 *     description: >
 *       Records the patient's arrival at the front desk: `SCHEDULED` →
 *       `CHECKED_IN`, stamping `checkedInAt`. This is the first step of the visit
 *       lifecycle and the signal that puts the patient on the doctor's waiting
 *       list.
 *
 *
 *       Only a `SCHEDULED` appointment can be checked in; any other status is a
 *       `409`. The request has no body.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:write` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `DOCTOR` and `RECEPTIONIST`.
 *     operationId: checkInAppointment
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The patient is checked in.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-14'
 *                 startTime: '09:30:00'
 *                 endTime: '10:00:00'
 *                 status: CHECKED_IN
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: '2026-08-14T09:22:07.000Z'
 *                 completedAt: null
 *                 cancelledAt: null
 *                 cancelledReason: null
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such appointment, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       409:
 *         description: The appointment is not in `SCHEDULED`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: Cannot move a COMPLETED appointment to CHECKED_IN
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/check-in",
	requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await checkInAppointment(id, actorFrom(req), req) });
	},
);

/**
 * @openapi
 * /api/appointments/{id}/start:
 *   post:
 *     tags: [Appointments]
 *     summary: Start the consultation
 *     description: >
 *       Marks the patient as being seen: `CHECKED_IN` → `IN_PROGRESS`. Only a
 *       checked-in appointment can be started, which keeps the waiting-room
 *       queue honest — a patient cannot be in consultation without having
 *       arrived. The request has no body.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:write` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `DOCTOR` and `RECEPTIONIST`.
 *     operationId: startAppointment
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The consultation is under way.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-14'
 *                 startTime: '09:30:00'
 *                 endTime: '10:00:00'
 *                 status: IN_PROGRESS
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: '2026-08-14T09:22:07.000Z'
 *                 completedAt: null
 *                 cancelledAt: null
 *                 cancelledReason: null
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such appointment, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       409:
 *         description: The appointment is not in `CHECKED_IN`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: Cannot move a SCHEDULED appointment to IN_PROGRESS
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/start",
	requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
	validate({ params: uuidParamSchema }),
	requireOwnershipOr(PERMISSIONS.APPOINTMENT_WRITE, async (req) =>
		getAppointmentOwnerUserId(paramId(req)),
	),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await startAppointment(id, actorFrom(req), req) });
	},
);

/**
 * @openapi
 * /api/appointments/{id}/complete:
 *   post:
 *     tags: [Appointments]
 *     summary: Complete the visit and raise the bill
 *     description: >
 *       Closes the visit: `IN_PROGRESS` → `COMPLETED`, stamping `completedAt`.
 *       In the same transaction it raises a `PENDING` bill for the doctor's
 *       current consultation fee, so billing never depends on someone
 *       remembering to invoice afterwards.
 *
 *
 *       The bill is only created if the appointment does not already have one,
 *       which makes a repeated call harmless on the billing side. Only an
 *       `IN_PROGRESS` appointment can be completed. The request has no body.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:write` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `DOCTOR` and `RECEPTIONIST`.
 *     operationId: completeAppointment
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The visit is complete and a bill has been issued.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-14'
 *                 startTime: '09:30:00'
 *                 endTime: '10:00:00'
 *                 status: COMPLETED
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: '2026-08-14T09:22:07.000Z'
 *                 completedAt: '2026-08-14T10:04:55.000Z'
 *                 cancelledAt: null
 *                 cancelledReason: null
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such appointment, or the doctor on it no longer exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       409:
 *         description: The appointment is not in `IN_PROGRESS`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: Cannot complete a CHECKED_IN appointment
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/complete",
	requirePermission(PERMISSIONS.APPOINTMENT_WRITE),
	validate({ params: uuidParamSchema }),
	requireOwnershipOr(PERMISSIONS.APPOINTMENT_WRITE, async (req) =>
		getAppointmentOwnerUserId(paramId(req)),
	),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await completeAppointment(id, actorFrom(req), req) });
	},
);

/**
 * @openapi
 * /api/appointments/{id}/cancel:
 *   post:
 *     tags: [Appointments]
 *     summary: Cancel an appointment
 *     description: >
 *       Calls the visit off and frees the slot, stamping `cancelledAt` and
 *       storing the optional reason. Works from `SCHEDULED`, `CHECKED_IN` or
 *       `IN_PROGRESS`; a completed visit cannot be cancelled after the fact.
 *
 *
 *       Cancellation is terminal — reinstating a visit means booking a new
 *       appointment. Use `no-show` instead when the patient simply never turned
 *       up, so the two cases stay distinguishable in reporting.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:cancel` — held by `SUPER_ADMIN`,
 *       `ADMIN`, `DOCTOR` and `RECEPTIONIST`.
 *     operationId: cancelAppointment
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/CancelAppointment'
 *     responses:
 *       200:
 *         description: The appointment was cancelled.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-14'
 *                 startTime: '09:30:00'
 *                 endTime: '10:00:00'
 *                 status: CANCELLED
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: null
 *                 completedAt: null
 *                 cancelledAt: '2026-08-13T16:41:09.000Z'
 *                 cancelledReason: Patient requested to reschedule
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such appointment, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       409:
 *         description: The appointment is already completed, cancelled or marked as a no-show.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: Cannot move a COMPLETED appointment to CANCELLED
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/cancel",
	requirePermission(PERMISSIONS.APPOINTMENT_CANCEL),
	validate({ params: uuidParamSchema, body: cancelAppointmentSchema }),
	requireOwnershipOr(PERMISSIONS.APPOINTMENT_CANCEL, async (req) =>
		getAppointmentOwnerUserId(paramId(req)),
	),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const input = validated<CancelAppointmentInput>(req, "body");
		res.json({ data: await cancelAppointment(id, input, actorFrom(req), req) });
	},
);

/**
 * @openapi
 * /api/appointments/{id}/no-show:
 *   post:
 *     tags: [Appointments]
 *     summary: Mark an appointment as a no-show
 *     description: >
 *       Records that the patient never turned up: `SCHEDULED` or `CHECKED_IN` →
 *       `NO_SHOW`. Unlike a cancellation, the visit is preserved in reporting as
 *       a missed appointment, which keeps the two cases distinguishable. The
 *       request has no body.
 *
 *
 *       A completed or cancelled appointment cannot be marked as a no-show.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `appointment:cancel` — held by `SUPER_ADMIN`,
 *       `ADMIN`, `DOCTOR` and `RECEPTIONIST`.
 *     operationId: markNoShow
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The appointment was marked as a no-show.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppointmentResponse'
 *             example:
 *               data:
 *                 id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 createdBy: 1c0b9a87-5d4e-4f3a-8b2c-9e0d1f2a3b4c
 *                 appointmentDate: '2026-08-14'
 *                 startTime: '09:30:00'
 *                 endTime: '10:00:00'
 *                 status: NO_SHOW
 *                 reason: Follow-up on elevated blood pressure readings
 *                 checkedInAt: null
 *                 completedAt: null
 *                 cancelledAt: null
 *                 cancelledReason: null
 *                 createdAt: '2026-08-03T08:15:22.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *                 createdByName: Tunde Bakare
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such appointment, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       409:
 *         description: The appointment is not in `SCHEDULED` or `CHECKED_IN`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: Cannot move a COMPLETED appointment to NO_SHOW
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/no-show",
	requirePermission(PERMISSIONS.APPOINTMENT_CANCEL),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await markNoShow(id, actorFrom(req), req) });
	},
);

export default router;
