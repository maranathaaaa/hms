import { Router } from "express";
import type { z } from "zod";

import { PERMISSIONS } from "../constants/index.ts";
import {
	requireAuth,
	requirePermission,
	validate,
	validated,
} from "../middleware/index.ts";
import {
	createPatient,
	getPatientById,
	listPatients,
	softDeletePatient,
	updatePatient,
} from "../services/patient.service.ts";
import { actorFrom, uuidParamSchema } from "../utils/index.ts";
import {
	type InsertPatient,
	insertPatientSchema,
	type ListPatientsQuery,
	listPatientsQuerySchema,
	type UpdatePatient,
	updatePatientSchema,
} from "../validators/index.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/patients:
 *   get:
 *     tags: [Patients]
 *     summary: List patients
 *     description: >
 *       Paginated patient register, most recently registered first. The `search`
 *       parameter is what the front desk uses to find someone at the counter: it
 *       matches first name, last name, email or phone number, so a partial
 *       spelling or the last few digits of a number is enough.
 *
 *
 *       Soft-deleted patients are hidden unless `includeDeleted` is set.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `patient:read` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `DOCTOR`, `RECEPTIONIST` and `ACCOUNTANT`.
 *     operationId: listPatients
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: search
 *         in: query
 *         required: false
 *         description: >
 *           Case-insensitive substring match on first name, last name, email or
 *           contact number.
 *         schema:
 *           type: string
 *           maxLength: 255
 *         example: adeyemi
 *       - $ref: '#/components/parameters/IncludeDeletedParam'
 *     responses:
 *       200:
 *         description: A page of patients.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPatients'
 *             example:
 *               data:
 *                 - id: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                   firstName: Ngozi
 *                   lastName: Adeyemi
 *                   dateOfBirth: '1991-04-17'
 *                   gender: FEMALE
 *                   contactNumber: '+2348031234567'
 *                   email: ngozi.adeyemi@example.com
 *                   address: 12 Bode Thomas Street, Surulere, Lagos
 *                   bloodGroup: O+
 *                   emergencyContactName: Chidi Adeyemi
 *                   emergencyContactPhone: '+2348039876543'
 *                   createdAt: '2026-02-02T10:24:05.000Z'
 *                   updatedAt: '2026-02-02T10:24:05.000Z'
 *                   deletedAt: null
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 1284
 *                 totalPages: 65
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/",
	requirePermission(PERMISSIONS.PATIENT_READ),
	validate({ query: listPatientsQuerySchema }),
	async (req, res) => {
		const query = validated<ListPatientsQuery>(req, "query");
		res.json(await listPatients(query));
	},
);

/**
 * @openapi
 * /api/patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Retrieve a patient
 *     description: >
 *       The full demographic record: identity, contact details, blood group and
 *       next of kin. This is the header a clinician sees before opening a chart.
 *       Soft-deleted patients are reported as `404`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `patient:read` — held by `SUPER_ADMIN`, `ADMIN`,
 *       `DOCTOR`, `RECEPTIONIST` and `ACCOUNTANT`.
 *     operationId: getPatientById
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The patient.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *             example:
 *               data:
 *                 id: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 firstName: Ngozi
 *                 lastName: Adeyemi
 *                 dateOfBirth: '1991-04-17'
 *                 gender: FEMALE
 *                 contactNumber: '+2348031234567'
 *                 email: ngozi.adeyemi@example.com
 *                 address: 12 Bode Thomas Street, Surulere, Lagos
 *                 bloodGroup: O+
 *                 emergencyContactName: Chidi Adeyemi
 *                 emergencyContactPhone: '+2348039876543'
 *                 createdAt: '2026-02-02T10:24:05.000Z'
 *                 updatedAt: '2026-02-02T10:24:05.000Z'
 *                 deletedAt: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such patient, or the record has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Patient not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/:id",
	requirePermission(PERMISSIONS.PATIENT_READ),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await getPatientById(id) });
	},
);

/**
 * @openapi
 * /api/patients:
 *   post:
 *     tags: [Patients]
 *     summary: Register a patient
 *     description: >
 *       Creates the demographic record a visit hangs off. A patient record is
 *       independent of any user account — most patients never sign in — so this
 *       is the registration a receptionist performs at the counter, not an
 *       account sign-up.
 *
 *
 *       `email` is optional but must be unique when given, which is what stops
 *       the same person being registered twice from two desks.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `patient:write` — held by `SUPER_ADMIN`, `ADMIN` and
 *       `RECEPTIONIST`.
 *     operationId: createPatient
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreatePatient'
 *     responses:
 *       201:
 *         description: The patient was registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *             example:
 *               data:
 *                 id: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 firstName: Ngozi
 *                 lastName: Adeyemi
 *                 dateOfBirth: '1991-04-17'
 *                 gender: FEMALE
 *                 contactNumber: '+2348031234567'
 *                 email: ngozi.adeyemi@example.com
 *                 address: 12 Bode Thomas Street, Surulere, Lagos
 *                 bloodGroup: O+
 *                 emergencyContactName: Chidi Adeyemi
 *                 emergencyContactPhone: '+2348039876543'
 *                 createdAt: '2026-08-03T09:52:14.000Z'
 *                 updatedAt: '2026-08-03T09:52:14.000Z'
 *                 deletedAt: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: A patient with that email address already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: A patient with that email already exists
 *       422:
 *         description: >
 *           Validation failed — a missing required field, an unknown gender or
 *           blood group, or a `dateOfBirth` that is not `YYYY-MM-DD`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: body.dateOfBirth
 *                     code: invalid_format
 *                     message: Must be a valid date (YYYY-MM-DD)
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/",
	requirePermission(PERMISSIONS.PATIENT_WRITE),
	validate({ body: insertPatientSchema }),
	async (req, res) => {
		const input = validated<InsertPatient>(req, "body");
		res.status(201).json({
			data: await createPatient(input, { id: actorFrom(req).id }, req),
		});
	},
);

/**
 * @openapi
 * /api/patients/{id}:
 *   patch:
 *     tags: [Patients]
 *     summary: Update a patient
 *     description: >
 *       Partial update of the demographic record — send only what changed. The
 *       everyday use is a corrected phone number, a new address or a next of kin
 *       added after the first visit.
 *
 *
 *       Changing `email` re-checks uniqueness against the rest of the register.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `patient:write` — held by `SUPER_ADMIN`, `ADMIN` and
 *       `RECEPTIONIST`.
 *     operationId: updatePatient
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/UpdatePatient'
 *     responses:
 *       200:
 *         description: The updated patient.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatientResponse'
 *             example:
 *               data:
 *                 id: 9b2e4d61-77c3-4f0a-8a5d-1c6b3e9f2d84
 *                 firstName: Ngozi
 *                 lastName: Adeyemi
 *                 dateOfBirth: '1991-04-17'
 *                 gender: FEMALE
 *                 contactNumber: '+2348070001111'
 *                 email: ngozi.adeyemi@example.com
 *                 address: 45 Awolowo Road, Ikoyi, Lagos
 *                 bloodGroup: O+
 *                 emergencyContactName: Chidi Adeyemi
 *                 emergencyContactPhone: '+2348039876543'
 *                 createdAt: '2026-02-02T10:24:05.000Z'
 *                 updatedAt: '2026-08-03T09:58:41.000Z'
 *                 deletedAt: null
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such patient, or the record has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Patient not found
 *       409:
 *         description: Another patient already uses that email address.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: A patient with that email already exists
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
	"/:id",
	requirePermission(PERMISSIONS.PATIENT_WRITE),
	validate({ params: uuidParamSchema, body: updatePatientSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const input = validated<UpdatePatient>(req, "body");
		res.json({
			data: await updatePatient(id, input, { id: actorFrom(req).id }, req),
		});
	},
);

/**
 * @openapi
 * /api/patients/{id}:
 *   delete:
 *     tags: [Patients]
 *     summary: Soft-delete a patient
 *     description: >
 *       Marks the register entry deleted and hides it from listings and lookups.
 *       Nothing is erased: appointments, medical records and bills keep pointing
 *       at the row, which is what makes the clinical and financial history
 *       remain readable after the fact.
 *
 *
 *       Deleted patients can still be listed with `includeDeleted=true`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `patient:delete` — held by `SUPER_ADMIN` and `ADMIN`.
 *     operationId: deletePatient
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
 *         description: No such patient, or the record was already deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Patient not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
	"/:id",
	requirePermission(PERMISSIONS.PATIENT_DELETE),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		await softDeletePatient(id, { id: actorFrom(req).id }, req);
		res.status(204).send();
	},
);

export default router;
