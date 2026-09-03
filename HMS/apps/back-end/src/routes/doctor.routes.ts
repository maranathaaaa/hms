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
	getDoctorById,
	getDoctorByUserId,
	listDoctors,
	updateDoctorProfile,
} from "../services/doctor.service.ts";
import { actorFrom, paramId, uuidParamSchema } from "../utils/index.ts";
import {
	type ListDoctorsQuery,
	listDoctorsQuerySchema,
	type UpdateDoctorProfileInput,
	updateDoctorProfileSchema,
} from "../validators/index.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/doctors:
 *   get:
 *     tags: [Doctors]
 *     summary: List doctors
 *     description: >
 *       Paginated directory of clinical profiles joined with the identity of the
 *       account behind each one, newest first. This is what a booking screen
 *       reads to let a receptionist pick a doctor, so it carries the
 *       consultation fee that will be billed when the visit completes.
 *
 *
 *       Doctors whose profile or account has been soft-deleted are hidden unless
 *       `includeDeleted` is set.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `doctor:read` — held by every role except
 *       `ACCOUNTANT`.
 *     operationId: listDoctors
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: search
 *         in: query
 *         required: false
 *         description: Case-insensitive substring match on name, specialization or department.
 *         schema:
 *           type: string
 *           maxLength: 255
 *         example: cardio
 *       - name: department
 *         in: query
 *         required: false
 *         description: Exact department match. Unlike `search`, this is not fuzzy.
 *         schema:
 *           type: string
 *           maxLength: 100
 *         example: Internal Medicine
 *       - $ref: '#/components/parameters/IncludeDeletedParam'
 *     responses:
 *       200:
 *         description: A page of doctors.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedDoctors'
 *             example:
 *               data:
 *                 - id: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                   userId: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                   name: Dr. Amara Okafor
 *                   email: amara.okafor@nexacare.health
 *                   specialization: Cardiology
 *                   department: Internal Medicine
 *                   licenseNumber: MDCN-2019-44821
 *                   consultationFee: '150.00'
 *                   isActive: true
 *                   createdAt: '2026-01-14T09:12:44.000Z'
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 37
 *                 totalPages: 2
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
	requirePermission(PERMISSIONS.DOCTOR_READ),
	validate({ query: listDoctorsQuerySchema }),
	async (req, res) => {
		const query = validated<ListDoctorsQuery>(req, "query");
		res.json(await listDoctors(query));
	},
);

/**
 * @openapi
 * /api/doctors/{id}:
 *   get:
 *     tags: [Doctors]
 *     summary: Retrieve a doctor
 *     description: >
 *       One clinical profile with the name, email and activation state of the
 *       account it belongs to. The `id` here is the **doctor profile id** — the
 *       same value appointments and medical records reference as `doctorId` —
 *       not the user id.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `doctor:read` — held by every role except
 *       `ACCOUNTANT`.
 *     operationId: getDoctorById
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The doctor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorResponse'
 *             example:
 *               data:
 *                 id: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 userId: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                 name: Dr. Amara Okafor
 *                 email: amara.okafor@nexacare.health
 *                 specialization: Cardiology
 *                 department: Internal Medicine
 *                 licenseNumber: MDCN-2019-44821
 *                 consultationFee: '150.00'
 *                 isActive: true
 *                 createdAt: '2026-01-14T09:12:44.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such doctor, or the profile or its account has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Doctor not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/:id",
	requirePermission(PERMISSIONS.DOCTOR_READ),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await getDoctorById(id) });
	},
);

/**
 * @openapi
 * /api/doctors/me/profile:
 *   get:
 *     tags: [Doctors]
 *     summary: Retrieve the signed-in doctor's own profile
 *     description: >
 *       Resolves the caller's user id to their clinical profile. A doctor's own
 *       screens need the profile id — appointments and medical records are keyed
 *       by it, not by user id — and this is how a client gets it without
 *       searching the directory.
 *
 *
 *       Only meaningful for an account that actually has a profile: any other
 *       caller gets `404`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `doctor:read` — held by every role except
 *       `ACCOUNTANT`.
 *     operationId: getMyDoctorProfile
 *     responses:
 *       200:
 *         description: The caller's clinical profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorResponse'
 *             example:
 *               data:
 *                 id: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 userId: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                 name: Dr. Amara Okafor
 *                 email: amara.okafor@nexacare.health
 *                 specialization: Cardiology
 *                 department: Internal Medicine
 *                 licenseNumber: MDCN-2019-44821
 *                 consultationFee: '150.00'
 *                 isActive: true
 *                 createdAt: '2026-01-14T09:12:44.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: The caller has no doctor profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Doctor profile not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/me/profile",
	requirePermission(PERMISSIONS.DOCTOR_READ),
	async (req, res) => {
		res.json({ data: await getDoctorByUserId(actorFrom(req).id) });
	},
);

/**
 * @openapi
 * /api/doctors/{id}:
 *   patch:
 *     tags: [Doctors]
 *     summary: Update a doctor's clinical profile
 *     description: >
 *       Edits specialization, department, licence number and consultation fee.
 *       Identity fields — name, email, phone — belong to the user account and are
 *       changed through `POST /api/auth/update-user` instead.
 *
 *
 *       Changing the fee affects bills generated from that point on; invoices
 *       already issued keep the amount they were raised at.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** row-level. A caller holding `doctor:write`
 *       (`SUPER_ADMIN`, `ADMIN`) may edit any profile; anyone else may edit only
 *       the profile attached to their own account.
 *     operationId: updateDoctorProfile
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/UpdateDoctorProfile'
 *     responses:
 *       200:
 *         description: The updated profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctorResponse'
 *             example:
 *               data:
 *                 id: c7d8e9f0-1a2b-4c3d-8e5f-6a7b8c9d0e1f
 *                 userId: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                 name: Dr. Amara Okafor
 *                 email: amara.okafor@nexacare.health
 *                 specialization: Interventional Cardiology
 *                 department: Cardiothoracic Surgery
 *                 licenseNumber: MDCN-2019-44821
 *                 consultationFee: '175.00'
 *                 isActive: true
 *                 createdAt: '2026-01-14T09:12:44.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: The caller neither holds `doctor:write` nor owns this profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: You do not have access to this resource
 *       404:
 *         description: No such doctor, or the profile has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: Doctor not found
 *       409:
 *         description: Another doctor already holds that licence number.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: DUPLICATE
 *                 message: A record with these details already exists
 *       422:
 *         description: >
 *           Validation failed — an empty body, or a `consultationFee` that is not
 *           a non-negative amount with at most two decimal places.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: body.consultationFee
 *                     code: invalid_format
 *                     message: Must be a non-negative amount with up to 2 decimal places
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
	"/:id",
	validate({ params: uuidParamSchema, body: updateDoctorProfileSchema }),
	requireOwnershipOr(PERMISSIONS.DOCTOR_WRITE, async (req) => {
		const doctor = await getDoctorById(paramId(req));
		return doctor.userId;
	}),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const input = validated<UpdateDoctorProfileInput>(req, "body");
		res.json({
			data: await updateDoctorProfile(id, input, actorFrom(req), req),
		});
	},
);

export default router;
