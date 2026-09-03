import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import { z } from "zod";

import { PERMISSIONS, ROLE_VALUES } from "../constants/index.ts";
import {
	requireAuth,
	requirePermission,
	validate,
	validated,
} from "../middleware/index.ts";
import {
	assignRole,
	createStaffUser,
	getUserById,
	listUsers,
	setUserActive,
	softDeleteUser,
} from "../services/user.service.ts";
import { actorFrom, uuidParamSchema } from "../utils/index.ts";
import {
	type AdminCreateUserInput,
	adminCreateUserSchema,
	type ListUsersQuery,
	listUsersQuerySchema,
} from "../validators/index.ts";

const toBoolean = z.preprocess((value) => {
	if (value === true || value === "true" || value === "1") return true;
	if (value === false || value === "false" || value === "0") return false;
	return value;
}, z.boolean());

const assignRoleSchema = z.object({ role: z.enum(ROLE_VALUES) });
const setActiveSchema = z.object({ isActive: toBoolean });

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List user accounts
 *     description: >
 *       Paginated directory of every account in the system — staff and portal
 *       users alike — newest first. Use it to build admin tables, to find an
 *       account before changing its role, or to audit who still has access.
 *
 *
 *       Soft-deleted accounts are hidden unless `includeDeleted` is set.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `user:read` — held by `SUPER_ADMIN` and `ADMIN`.
 *     operationId: listUsers
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - name: search
 *         in: query
 *         required: false
 *         description: Case-insensitive substring match on name or email.
 *         schema:
 *           type: string
 *           maxLength: 255
 *         example: bakare
 *       - name: role
 *         in: query
 *         required: false
 *         description: Return only accounts holding this role.
 *         schema:
 *           $ref: '#/components/schemas/RoleName'
 *         example: DOCTOR
 *       - name: isActive
 *         in: query
 *         required: false
 *         description: Filter by activation state. Accepts `true`/`false` or `1`/`0`.
 *         schema:
 *           type: boolean
 *         example: true
 *       - $ref: '#/components/parameters/IncludeDeletedParam'
 *     responses:
 *       200:
 *         description: A page of accounts.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedUsers'
 *             example:
 *               data:
 *                 - id: 3f1a9c2e-6b7d-4c8a-9f21-0d5e8b4a7c31
 *                   name: Tunde Bakare
 *                   email: tunde.bakare@nexacare.health
 *                   role: RECEPTIONIST
 *                   phone: '+2348022223333'
 *                   image: null
 *                   isActive: true
 *                   emailVerified: true
 *                   lastLoginAt: '2026-08-03T07:41:18.000Z'
 *                   createdAt: '2026-01-09T11:02:37.000Z'
 *               meta:
 *                 page: 1
 *                 limit: 20
 *                 total: 137
 *                 totalPages: 7
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
	requirePermission(PERMISSIONS.USER_READ),
	validate({ query: listUsersQuerySchema }),
	async (req, res) => {
		const query = validated<ListUsersQuery>(req, "query");
		res.json(await listUsers(query));
	},
);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Provision a staff account
 *     description: >
 *       Creates an account with an explicit role, which is the only way to mint
 *       anything other than a `PATIENT` — self-service sign-up always lands on
 *       the default role. The password is hashed by Better Auth, so a
 *       provisioned account is indistinguishable from a self-registered one, and
 *       the new user can sign in immediately.
 *
 *
 *       Creating a `DOCTOR` also creates the 1:1 clinical profile, so
 *       `doctorProfile` is required for that role and ignored for every other.
 *       Accounts are marked email-verified unless `emailVerified: false` is sent.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `user:write` — held by `SUPER_ADMIN` and `ADMIN`.
 *       Only a `SUPER_ADMIN` may create another `SUPER_ADMIN`.
 *     operationId: createUser
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreateUser'
 *     responses:
 *       201:
 *         description: The account was created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *             example:
 *               data:
 *                 id: 3f1a9c2e-6b7d-4c8a-9f21-0d5e8b4a7c31
 *                 name: Tunde Bakare
 *                 email: tunde.bakare@nexacare.health
 *                 role: RECEPTIONIST
 *                 phone: '+2348022223333'
 *                 image: null
 *                 isActive: true
 *                 emailVerified: true
 *                 lastLoginAt: null
 *                 createdAt: '2026-08-03T09:41:02.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: The caller lacks `user:write`, or tried to create a `SUPER_ADMIN` without being one.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: Only a SUPER_ADMIN can create a SUPER_ADMIN
 *       409:
 *         description: That email address is already registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: CONFLICT
 *                 message: A user with that email already exists
 *       422:
 *         description: >
 *           Validation failed — for example a password under 12 characters, an
 *           unknown role, or a `DOCTOR` created without `doctorProfile`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *             example:
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed
 *                 details:
 *                   - path: body.doctorProfile
 *                     code: custom
 *                     message: doctorProfile is required when creating a doctor account
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
	"/",
	requirePermission(PERMISSIONS.USER_WRITE),
	validate({ body: adminCreateUserSchema }),
	async (req, res) => {
		const input = validated<AdminCreateUserInput>(req, "body");
		const user = await createStaffUser(
			input,
			actorFrom(req),
			fromNodeHeaders(req.headers),
		);
		res.status(201).json({ data: user });
	},
);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Retrieve a user account
 *     description: >
 *       Full account detail, including the role name resolved from the roles
 *       table and the last time the account signed in. Soft-deleted accounts are
 *       reported as `404`.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `user:read` — held by `SUPER_ADMIN` and `ADMIN`.
 *     operationId: getUserById
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: The account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *             example:
 *               data:
 *                 id: 3f1a9c2e-6b7d-4c8a-9f21-0d5e8b4a7c31
 *                 name: Tunde Bakare
 *                 email: tunde.bakare@nexacare.health
 *                 role: RECEPTIONIST
 *                 phone: '+2348022223333'
 *                 image: null
 *                 isActive: true
 *                 emailVerified: true
 *                 lastLoginAt: '2026-08-03T07:41:18.000Z'
 *                 createdAt: '2026-01-09T11:02:37.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: No such account, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: User not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
	"/:id",
	requirePermission(PERMISSIONS.USER_READ),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		res.json({ data: await getUserById(id) });
	},
);

/**
 * @openapi
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change a user's role
 *     description: >
 *       Moves an account onto a different role, which swaps its entire
 *       permission set. Every session the user holds is destroyed in the same
 *       breath, so a demotion takes effect on their next request instead of
 *       whenever their cookie happens to expire.
 *
 *
 *       Callers cannot change their own role — that closes the obvious
 *       self-escalation path.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `role:manage` — held by `SUPER_ADMIN` only.
 *     operationId: assignUserRole
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/AssignRole'
 *     responses:
 *       200:
 *         description: The role was changed and the user's sessions were revoked.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *             example:
 *               data:
 *                 id: 3f1a9c2e-6b7d-4c8a-9f21-0d5e8b4a7c31
 *                 name: Tunde Bakare
 *                 email: tunde.bakare@nexacare.health
 *                 role: ADMIN
 *                 phone: '+2348022223333'
 *                 image: null
 *                 isActive: true
 *                 emailVerified: true
 *                 lastLoginAt: '2026-08-03T07:41:18.000Z'
 *                 createdAt: '2026-01-09T11:02:37.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: The caller lacks `role:manage`, or is trying to change their own role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               selfChange:
 *                 summary: Changing your own role
 *                 value:
 *                   error:
 *                     code: FORBIDDEN
 *                     message: You cannot change your own role
 *               missingPermission:
 *                 summary: Not a SUPER_ADMIN
 *                 value:
 *                   error:
 *                     code: FORBIDDEN
 *                     message: 'Missing permission: role:manage'
 *       404:
 *         description: No such account, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: User not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
	"/:id/role",
	requirePermission(PERMISSIONS.ROLE_MANAGE),
	validate({ params: uuidParamSchema, body: assignRoleSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const { role } = validated<z.infer<typeof assignRoleSchema>>(req, "body");
		res.json({ data: await assignRole(id, role, actorFrom(req)) });
	},
);

/**
 * @openapi
 * /api/users/{id}/active:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate an account
 *     description: >
 *       Suspends or restores access without destroying anything. Deactivating
 *       also revokes the user's sessions, so they are signed out everywhere
 *       within the same request; reactivating simply lets them sign in again.
 *
 *
 *       Prefer this over deletion for staff who are on leave or have left —
 *       their audit trail and authored records stay intact and attributable.
 *       Callers cannot deactivate themselves.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `user:write` — held by `SUPER_ADMIN` and `ADMIN`.
 *     operationId: setUserActive
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/SetUserActive'
 *     responses:
 *       200:
 *         description: The activation state was updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *             example:
 *               data:
 *                 id: 3f1a9c2e-6b7d-4c8a-9f21-0d5e8b4a7c31
 *                 name: Tunde Bakare
 *                 email: tunde.bakare@nexacare.health
 *                 role: RECEPTIONIST
 *                 phone: '+2348022223333'
 *                 image: null
 *                 isActive: false
 *                 emailVerified: true
 *                 lastLoginAt: '2026-08-03T07:41:18.000Z'
 *                 createdAt: '2026-01-09T11:02:37.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: The caller lacks `user:write`, or is trying to deactivate their own account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: You cannot deactivate your own account
 *       404:
 *         description: No such account, or it has been soft-deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: User not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
	"/:id/active",
	requirePermission(PERMISSIONS.USER_WRITE),
	validate({ params: uuidParamSchema, body: setActiveSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		const { isActive } = validated<z.infer<typeof setActiveSchema>>(
			req,
			"body",
		);
		res.json({
			data: await setUserActive(id, isActive, { id: actorFrom(req).id }),
		});
	},
);

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete a user account
 *     description: >
 *       Marks the account deleted, deactivates it and revokes its sessions. The
 *       row survives so that audit entries and authored records keep a valid
 *       foreign key and stay attributable — nothing is erased.
 *
 *
 *       Deleted accounts disappear from `GET /api/users` unless
 *       `includeDeleted=true` is passed, and can no longer sign in. Callers
 *       cannot delete themselves.
 *
 *
 *       **Authentication:** session cookie required.
 *       **Authorization:** `user:delete` — held by `SUPER_ADMIN` and `ADMIN`.
 *     operationId: deleteUser
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       204:
 *         $ref: '#/components/responses/NoContent'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: The caller lacks `user:delete`, or is trying to delete their own account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: You cannot delete your own account
 *       404:
 *         description: No such account, or it was already deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: NOT_FOUND
 *                 message: User not found
 *       422:
 *         $ref: '#/components/responses/ValidationFailed'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
	"/:id",
	requirePermission(PERMISSIONS.USER_DELETE),
	validate({ params: uuidParamSchema }),
	async (req, res) => {
		const { id } = validated<z.infer<typeof uuidParamSchema>>(req, "params");
		await softDeleteUser(id, { id: actorFrom(req).id });
		res.status(204).send();
	},
);

export default router;
