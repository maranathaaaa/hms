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
import { upload } from "../middleware/upload.middleware.ts";
import {
	attachReport,
	createMedicalRecord,
	getMedicalRecordById,
	getMedicalRecordOwnerUserId,
	listMedicalRecords,
	softDeleteMedicalRecord,
	throwIfDuplicateAppointment,
	updateMedicalRecord,
} from "../services/medical-record.service.ts";
import { actorFrom, paramId, uuidParamSchema } from "../utils/index.ts";
import {
	type CreateMedicalRecordInput,
	createMedicalRecordSchema,
	type ListMedicalRecordsQuery,
	listMedicalRecordsQuerySchema,
	type UpdateMedicalRecordInput,
	updateMedicalRecordSchema,
} from "../validators/index.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/medical-records:
 *   get:
 *     tags: [Medical Records]
 *     summary: List medical records
 *     description: >
 *       The clinical chart index, newest first. Each entry carries the patient
 *       and doctor names plus the attached report path, so a chart view renders
 *       without follow-up lookups.
 *
 *
 *       Combine `patientId` with `doctorId` to trace one clinician's notes for a
 *       patient, or `includeDeleted` to audit records that were removed. **A
 *       `DOCTOR` is always scoped to the records they authored** — the filter is
 *       applied server-side and cannot be widened.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `medical_record:read` — held by `SUPER_ADMIN`,
 *       `ADMIN` and `DOCTOR`.
 *     operationId: listMedicalRecords
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/PatientIdFilterParam'
 *       - $ref: '#/components/parameters/DoctorIdFilterParam'
 *       - $ref: '#/components/parameters/IncludeDeletedParam'
 *     responses:
 *       200:
 *         description: A page of medical records.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedMedicalRecords'
 *             example:
 *               data:
 *                 - id: 5d3b7f11-8c62-4a90-b1e4-7f0a2c9d6e38
 *                   patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                   doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                   appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                   diagnosis: Stage 1 hypertension (ICD-10 I10), otherwise unremarkable exam.
 *                   prescription: Amlodipine 5 mg once daily for 30 days.
 *                   treatmentPlan: Low-sodium diet, 30 minutes of walking five days a week, review in six weeks.
 *                   reportFileUrl: /uploads/6f1b0c2d-8a4e-4d19-9c37-5b2e1f0a8d64.pdf
 *                   createdAt: '2026-08-14T10:05:41.000Z'
 *                   updatedAt: '2026-08-14T10:05:41.000Z'
 *                   patientName: Ngozi Adeyemi
 *                   doctorName: Dr. Amara Okafor
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 341
 *                 totalPages: 18
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: The caller is a `DOCTOR` with no clinical profile, so no records can be resolved.
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
	requirePermission(PERMISSIONS.MEDICAL_RECORD_READ),
	validate({ query: listMedicalRecordsQuerySchema }),
	async (req, res) => {
		const query = validated<ListMedicalRecordsQuery>(req, "query");
		res.json(await listMedicalRecords(query, actorFrom(req)));
	},
);

/**
 * @openapi
 * /api/medical-records/{id}:
 *   get:
 *     tags: [Medical Records]
 *     summary: Retrieve a medical record
 *     description: >
 *       One clinical note with its full narrative — diagnosis, prescription,
 *       treatment plan and the path of any attached report. Soft-deleted
 *       records are reported as `404`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `medical_record:read` — held by `SUPER_ADMIN`,
 *       `ADMIN` and `DOCTOR`.
 *     operationId: getMedicalRecordById
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The medical record.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecordResponse'
 *             example:
 *               data:
 *                 id: 5d3b7f11-8c62-4a90-b1e4-7f0a2c9d6e38
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 diagnosis: Stage 1 hypertension (ICD-10 I10), otherwise unremarkable exam.
 *                 prescription: Amlodipine 5 mg once daily for 30 days.
 *                 treatmentPlan: Low-sodium diet, 30 minutes of walking five days a week, review in six weeks.
 *                 reportFileUrl: /uploads/6f1b0c2d-8a4e-4d19-9c37-5b2e1f0a8d64.pdf
 *                 createdAt: '2026-08-14T10:05:41.000Z'
 *                 updatedAt: '2026-08-14T10:05:41.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such record, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Medical record not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/:id",
	requirePermission(PERMISSIONS.MEDICAL_RECORD_READ),
	validate({ params: uuidParamSchema }),
	requireOwnershipOr(PERMISSIONS.MEDICAL_RECORD_READ, async (req) =>
		getMedicalRecordOwnerUserId(paramId(req)),
	),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await getMedicalRecordById(id) });
	},
);

/**
 * @openapi
 * /api/medical-records:
 *   post:
 *     tags: [Medical Records]
 *     summary: Create a medical record
 *     description: >
 *       Writes the clinical note for a visit. When a `DOCTOR` calls this,
 *       `doctorId` is ignored and taken from their own profile; any other caller
 *       must supply it explicitly or gets `403`. `appointmentId` is optional but
 *       at most one record may reference a given appointment — a second attempt
 *       surfaces as `409`.
 *
 *
 *       The record is written and the audit trail updated in the same request;
 *       the doctor, patient and appointment links are immutable afterwards.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `medical_record:write` — held by `SUPER_ADMIN`,
 *       `ADMIN` and `DOCTOR`.
 *     operationId: createMedicalRecord
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreateMedicalRecord'
 *     responses:
 *       201:
 *         description: The record was created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecordResponse'
 *             example:
 *               data:
 *                 id: 5d3b7f11-8c62-4a90-b1e4-7f0a2c9d6e38
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 diagnosis: Stage 1 hypertension (ICD-10 I10), otherwise unremarkable exam.
 *                 prescription: Amlodipine 5 mg once daily for 30 days.
 *                 treatmentPlan: Low-sodium diet, 30 minutes of walking five days a week, review in six weeks.
 *                 reportFileUrl: null
 *                 createdAt: '2026-08-14T10:05:41.000Z'
 *                 updatedAt: '2026-08-14T10:05:41.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: A non-DOCTOR caller omitted `doctorId`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: An administrator must specify the doctor for this record
 *       404:
 *         description: The `appointmentId` does not resolve.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Appointment not found
 *       409:
 *         description: A record already exists for this appointment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: A record already exists for this appointment
 *       422:
 *         description: >
 *           Validation failed — a missing `diagnosis`, a `patientId`/`doctorId`
 *           that is not a UUID, or an `appointmentId` that does not resolve.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: body.diagnosis
 *                     code: too_small
 *                     message: Must be at least 1 character
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/",
	requirePermission(PERMISSIONS.MEDICAL_RECORD_WRITE),
	validate({ body: createMedicalRecordSchema }),
	async (req, res) => {
		const input = validated<CreateMedicalRecordInput>(req, "body");
		await throwIfDuplicateAppointment(input.appointmentId);
		res
			.status(201)
			.json({ data: await createMedicalRecord(input, actorFrom(req), req) });
	},
);

/**
 * @openapi
 * /api/medical-records/{id}:
 *   patch:
 *     tags: [Medical Records]
 *     summary: Update a medical record
 *     description: >
 *       Amends the clinical narrative — diagnosis, prescription and treatment
 *       plan are all editable; the patient, doctor and appointment links are
 *       not. At least one field must be present.
 *
 *
 *       A `DOCTOR` can only edit records they authored; an `ADMIN` or
 *       `SUPER_ADMIN` may edit any record.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `medical_record:write` — held by `SUPER_ADMIN`,
 *       `ADMIN` and `DOCTOR`.
 *     operationId: updateMedicalRecord
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/UpdateMedicalRecord'
 *     responses:
 *       200:
 *         description: The updated record.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecordResponse'
 *             example:
 *               data:
 *                 id: 5d3b7f11-8c62-4a90-b1e4-7f0a2c9d6e38
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 diagnosis: Stage 1 hypertension (ICD-10 I10), otherwise unremarkable exam.
 *                 prescription: Amlodipine 10 mg once daily for 30 days; recheck potassium in 2 weeks.
 *                 treatmentPlan: Low-sodium diet, 30 minutes of walking five days a week, review in six weeks.
 *                 reportFileUrl: /uploads/6f1b0c2d-8a4e-4d19-9c37-5b2e1f0a8d64.pdf
 *                 createdAt: '2026-08-14T10:05:41.000Z'
 *                 updatedAt: '2026-08-14T10:41:19.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: A `DOCTOR` tried to edit a record they did not author.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: You can only edit your own records
 *       404:
 *         description: No such record, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Medical record not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
	"/:id",
	requirePermission(PERMISSIONS.MEDICAL_RECORD_WRITE),
	validate({ params: uuidParamSchema, body: updateMedicalRecordSchema }),
	requireOwnershipOr(PERMISSIONS.MEDICAL_RECORD_WRITE, async (req) =>
		getMedicalRecordOwnerUserId(paramId(req)),
	),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const input = validated<UpdateMedicalRecordInput>(req, "body");
		res.json({
			data: await updateMedicalRecord(id, input, actorFrom(req), req),
		});
	},
);

/**
 * @openapi
 * /api/medical-records/{id}/report:
 *   post:
 *     tags: [Medical Records]
 *     summary: Attach a report file to a medical record
 *     description: >
 *       Uploads a report and points the record's `reportFileUrl` at it. The
 *       upload is a `multipart/form-data` request with exactly one file under
 *       the field name `file` — a PDF or image up to 5 MB. The stored filename
 *       is a fresh UUID, served back at `/uploads/{filename}`.
 *
 *
 *       A `DOCTOR` can only attach a report to a record they authored.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `medical_record:write` — held by `SUPER_ADMIN`,
 *       `ADMIN` and `DOCTOR`.
 *     operationId: attachReport
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/ReportUpload'
 *     responses:
 *       200:
 *         description: The report was attached.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalRecordResponse'
 *             example:
 *               data:
 *                 id: 5d3b7f11-8c62-4a90-b1e4-7f0a2c9d6e38
 *                 patientId: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 doctorId: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 appointmentId: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                 diagnosis: Stage 1 hypertension (ICD-10 I10), otherwise unremarkable exam.
 *                 prescription: Amlodipine 5 mg once daily for 30 days.
 *                 treatmentPlan: Low-sodium diet, 30 minutes of walking five days a week, review in six weeks.
 *                 reportFileUrl: /uploads/6f1b0c2d-8a4e-4d19-9c37-5b2e1f0a8d64.pdf
 *                 createdAt: '2026-08-14T10:05:41.000Z'
 *                 updatedAt: '2026-08-14T10:12:03.000Z'
 *                 patientName: Ngozi Adeyemi
 *                 doctorName: Dr. Amara Okafor
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: A `DOCTOR` tried to attach a report to a record they did not author.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: You can only edit your own records
 *       404:
 *         description: No such record, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Medical record not found
 *       413:
 *         $ref: '#/components/responses/PayloadTooLarge'
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/:id/report",
	requirePermission(PERMISSIONS.MEDICAL_RECORD_WRITE),
	validate({ params: uuidParamSchema }),
	requireOwnershipOr(PERMISSIONS.MEDICAL_RECORD_WRITE, async (req) =>
		getMedicalRecordOwnerUserId(paramId(req)),
	),
	(req, res, next) => {
		upload.single("file")(req, res, (error) => {
			if (error) return next(error);
			next();
		});
	},
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const file = req.file;
		if (!file) {
			res.status(400).json({
				error: { code: "UPLOAD_ERROR", message: "No file was uploaded" },
			});
			return;
		}
		const reportFileUrl = `/uploads/${file.filename}`;
		res.json({
			data: await attachReport(id, reportFileUrl, actorFrom(req), req),
		});
	},
);

/**
 * @openapi
 * /api/medical-records/{id}:
 *   delete:
 *     tags: [Medical Records]
 *     summary: Soft-delete a medical record
 *     description: >
 *       Marks the record deleted and hides it from listings and lookups, but
 *       never erases the row — the audit trail keeps pointing at it. The
 *       attached report file, if any, is left on disk.
 *
 *
 *       Deleted records can still be listed with `includeDeleted=true`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `medical_record:write` — held by `SUPER_ADMIN`,
 *       `ADMIN` and `DOCTOR`.
 *     operationId: deleteMedicalRecord
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       204:
 *         $ref: '#/components/responses/NoContent'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such record, or it was already deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Medical record not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
	"/:id",
	requirePermission(PERMISSIONS.MEDICAL_RECORD_WRITE),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		await softDeleteMedicalRecord(id, { id: actorFrom(req).id }, req);
		res.status(204).send();
	},
);

export default router;
