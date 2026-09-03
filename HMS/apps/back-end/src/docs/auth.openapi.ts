/**
 * OpenAPI documentation for the authentication surface.
 *
 * These routes are not declared by an Express router — Better Auth's own
 * handler is mounted wholesale at `/api/auth/*` in `index.ts`, so there is no
 * route file to hang the documentation off. This module is comments only; it is
 * read by `swagger-jsdoc` (see `apis` in `src/config/swagger.ts`) and never
 * imported at runtime.
 *
 * Session cookie: `hms.session_token`, `HttpOnly`, `SameSite=Lax` in
 * development and `SameSite=None; Secure` in production. Sessions last 7 days
 * and refresh once every 24 hours of use.
 */

/**
 * @openapi
 * /api/auth/sign-up/email:
 *   post:
 *     tags: [Authentication]
 *     summary: Register an account with email and password
 *     description: >
 *       Creates a credential account and its user row. New accounts always land
 *       on the default `PATIENT` role — the role can never be chosen by the
 *       person signing up.
 *
 *
 *       Self-service sign-up is **closed by default**: unless the deployment
 *       sets `ALLOW_PUBLIC_SIGNUP=true`, the caller must already be signed in as
 *       an `ADMIN` or `SUPER_ADMIN`, which is how `POST /api/users` provisions
 *       staff. Anonymous callers get `403` on a closed deployment.
 *
 *
 *       Auto sign-in is disabled, so a successful sign-up does not start a
 *       session; call `POST /api/auth/sign-in/email` afterwards.
 *       Rate limited to 3 requests per minute per IP.
 *     operationId: authSignUpEmail
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpEmailRequest'
 *           examples:
 *             default:
 *               summary: New portal account
 *               value:
 *                 name: Ngozi Adeyemi
 *                 email: ngozi.adeyemi@example.com
 *                 password: Correct-Horse-Battery-7
 *                 phone: '+2348031234567'
 *     responses:
 *       200:
 *         description: The account was created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: [string, 'null']
 *                 user:
 *                   $ref: '#/components/schemas/SessionUser'
 *             example:
 *               token: null
 *               user:
 *                 id: 3f1a9c2e-6b7d-4c8a-9f21-0d5e8b4a7c31
 *                 name: Ngozi Adeyemi
 *                 email: ngozi.adeyemi@example.com
 *                 emailVerified: false
 *                 image: null
 *                 phone: '+2348031234567'
 *                 roleId: 6
 *                 isActive: true
 *                 createdAt: '2026-08-03T09:20:11.000Z'
 *                 updatedAt: '2026-08-03T09:20:11.000Z'
 *       400:
 *         description: The password is shorter than 12 characters or longer than 128, or the payload is malformed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: PASSWORD_TOO_SHORT
 *                 message: Password too short
 *       403:
 *         description: Sign-up is closed on this deployment and the caller is not an administrator.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: Sign-up is disabled. Ask an administrator for an account.
 *       409:
 *         description: That email address is already registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: USER_ALREADY_EXISTS
 *                 message: User already exists
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/sign-in/email:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in with email and password
 *     description: >
 *       Verifies the credentials and starts a session. The session cookie comes
 *       back in the `Set-Cookie` header — browser clients must send the request
 *       with credentials included (`fetch(..., { credentials: 'include' })`) so
 *       the cookie is stored and replayed.
 *
 *
 *       Signing in also stamps `lastLoginAt` on the account and writes a `LOGIN`
 *       audit entry. Accounts that have been deactivated or soft-deleted are
 *       rejected even when the password is correct.
 *       Rate limited to 5 attempts per minute per IP.
 *     operationId: authSignInEmail
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInEmailRequest'
 *           examples:
 *             default:
 *               summary: Staff sign-in
 *               value:
 *                 email: amara.okafor@nexacare.health
 *                 password: Correct-Horse-Battery-7
 *                 rememberMe: true
 *     responses:
 *       200:
 *         description: Signed in. The session cookie is set on the response.
 *         headers:
 *           Set-Cookie:
 *             description: 'HttpOnly session cookie, e.g. `hms.session_token=...; Path=/; HttpOnly; SameSite=Lax`.'
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignInEmailResponse'
 *             example:
 *               redirect: false
 *               token: 5c8f0f5e5f0a4a2f9f0f6a1b2c3d4e5f
 *               user:
 *                 id: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                 name: Dr. Amara Okafor
 *                 email: amara.okafor@nexacare.health
 *                 emailVerified: true
 *                 image: null
 *                 phone: '+2348011112222'
 *                 roleId: 3
 *                 isActive: true
 *                 createdAt: '2026-01-14T09:12:44.000Z'
 *                 updatedAt: '2026-08-03T07:41:18.000Z'
 *       401:
 *         description: Unknown email address or wrong password. The two cases are deliberately indistinguishable.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: INVALID_EMAIL_OR_PASSWORD
 *                 message: Invalid email or password
 *       403:
 *         description: The credentials are valid but the account has been deactivated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: This account has been deactivated
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/sign-out:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign out of the current session
 *     description: >
 *       Revokes the session behind the request and clears the cookie. A `LOGOUT`
 *       audit entry is written. Other sessions belonging to the same user are
 *       untouched — use `POST /api/auth/revoke-other-sessions` for that.
 *     operationId: authSignOut
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: The session was revoked and the cookie cleared.
 *         headers:
 *           Set-Cookie:
 *             description: Expired session cookie that clears the browser's copy.
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *             example:
 *               success: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/get-session:
 *   get:
 *     tags: [Authentication]
 *     summary: Read the current session
 *     description: >
 *       Returns the active session together with its user, or `null` when the
 *       request carries no valid session cookie. Anonymous callers get `200` with
 *       a null body rather than `401`, which makes this the endpoint to call on
 *       page load to decide whether to show the app or the sign-in screen.
 *
 *
 *       Answers are served from a 5-minute signed cookie cache, so this is cheap
 *       to poll.
 *     operationId: authGetSession
 *     security: []
 *     responses:
 *       200:
 *         description: The session, or `null` when the caller is anonymous.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/SessionResponse'
 *                 - type: 'null'
 *             examples:
 *               signedIn:
 *                 summary: Active session
 *                 value:
 *                   session:
 *                     id: 4b8c1d2e-3f4a-4b5c-9d6e-7f8a9b0c1d2e
 *                     userId: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                     token: 5c8f0f5e5f0a4a2f9f0f6a1b2c3d4e5f
 *                     expiresAt: '2026-08-10T07:41:18.000Z'
 *                     ipAddress: 102.89.34.17
 *                     userAgent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
 *                     createdAt: '2026-08-03T07:41:18.000Z'
 *                     updatedAt: '2026-08-03T07:41:18.000Z'
 *                   user:
 *                     id: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                     name: Dr. Amara Okafor
 *                     email: amara.okafor@nexacare.health
 *                     emailVerified: true
 *                     image: null
 *                     phone: '+2348011112222'
 *                     roleId: 3
 *                     isActive: true
 *                     createdAt: '2026-01-14T09:12:44.000Z'
 *                     updatedAt: '2026-08-03T07:41:18.000Z'
 *               anonymous:
 *                 summary: No session cookie
 *                 value: null
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/list-sessions:
 *   get:
 *     tags: [Authentication]
 *     summary: List the caller's active sessions
 *     description: >
 *       Every unexpired session belonging to the signed-in user, across devices.
 *       Use the returned `token` with `POST /api/auth/revoke-session` to sign a
 *       single device out.
 *     operationId: authListSessions
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: The caller's sessions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Session'
 *             example:
 *               - id: 4b8c1d2e-3f4a-4b5c-9d6e-7f8a9b0c1d2e
 *                 userId: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                 token: 5c8f0f5e5f0a4a2f9f0f6a1b2c3d4e5f
 *                 expiresAt: '2026-08-10T07:41:18.000Z'
 *                 ipAddress: 102.89.34.17
 *                 userAgent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
 *                 createdAt: '2026-08-03T07:41:18.000Z'
 *                 updatedAt: '2026-08-03T07:41:18.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/revoke-session:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke one session
 *     description: >
 *       Signs out a single device by its session token, which comes from
 *       `GET /api/auth/list-sessions`. Only the caller's own sessions can be
 *       revoked this way.
 *     operationId: authRevokeSession
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Session token to revoke.
 *           example:
 *             token: 5c8f0f5e5f0a4a2f9f0f6a1b2c3d4e5f
 *     responses:
 *       200:
 *         description: The session was revoked.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       400:
 *         description: The token is missing or does not match a session.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: BAD_REQUEST
 *                 message: Session not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/revoke-other-sessions:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke every other session
 *     description: >
 *       Signs out every device except the one making the request. The natural
 *       follow-up to a password change on a possibly-compromised account.
 *     operationId: authRevokeOtherSessions
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All other sessions were revoked.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/revoke-sessions:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke every session, including this one
 *     description: >
 *       Signs the user out everywhere. The current session is destroyed too, so
 *       the caller must sign in again afterwards.
 *     operationId: authRevokeSessions
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Every session was revoked.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/forget-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Start a password reset
 *     description: >
 *       Issues a single-use reset token for the address, valid for 15 minutes.
 *       The response is deliberately identical whether or not the address is
 *       registered, so this endpoint cannot be used to enumerate accounts.
 *       Rate limited to 3 requests per 15 minutes per IP.
 *     operationId: authForgetPassword
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               redirectTo:
 *                 type: string
 *                 format: uri
 *                 description: Where the emailed link should land the user.
 *           example:
 *             email: amara.okafor@nexacare.health
 *             redirectTo: https://nexa-care-sooty.vercel.app/reset-password
 *     responses:
 *       200:
 *         description: The request was accepted. A token is issued only if the account exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Complete a password reset
 *     description: >
 *       Exchanges a reset token for a new password. The token is consumed on
 *       success and expires 15 minutes after it was issued. No session is
 *       started — sign in with the new password afterwards.
 *       Rate limited to 5 requests per 15 minutes per IP.
 *     operationId: authResetPassword
 *     security: []
 *     parameters:
 *       - name: token
 *         in: query
 *         required: false
 *         description: Reset token, when it is carried in the query string rather than the body.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 12
 *                 maxLength: 128
 *               token:
 *                 type: string
 *           example:
 *             newPassword: Correct-Horse-Battery-9
 *             token: 7f1c0a9e4d2b48c1a6f3e5d7b9c0a1e2
 *     responses:
 *       200:
 *         description: The password was changed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       400:
 *         description: The token is invalid, already used or expired, or the new password fails the length policy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: INVALID_TOKEN
 *                 message: Invalid or expired token
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change the signed-in user's password
 *     description: >
 *       Requires the current password as proof of possession. Set
 *       `revokeOtherSessions` to sign every other device out at the same time —
 *       the right default after a suspected compromise.
 *     operationId: authChangePassword
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 12
 *                 maxLength: 128
 *               revokeOtherSessions:
 *                 type: boolean
 *                 default: false
 *           example:
 *             currentPassword: Correct-Horse-Battery-7
 *             newPassword: Correct-Horse-Battery-9
 *             revokeOtherSessions: true
 *     responses:
 *       200:
 *         description: The password was changed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/SessionUser'
 *             example:
 *               user:
 *                 id: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                 name: Dr. Amara Okafor
 *                 email: amara.okafor@nexacare.health
 *                 emailVerified: true
 *                 image: null
 *                 phone: '+2348011112222'
 *                 roleId: 3
 *                 isActive: true
 *                 createdAt: '2026-01-14T09:12:44.000Z'
 *                 updatedAt: '2026-08-03T09:31:02.000Z'
 *       400:
 *         description: The current password is wrong or the new one fails the length policy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: INVALID_PASSWORD
 *                 message: Invalid password
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/change-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Change the signed-in user's email address
 *     description: >
 *       Moves the account to a new address. The address must not already be in
 *       use. Because `users.email` is unique, a collision surfaces as a `400`
 *       from Better Auth rather than a database error.
 *     operationId: authChangeEmail
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newEmail]
 *             properties:
 *               newEmail:
 *                 type: string
 *                 format: email
 *               callbackURL:
 *                 type: string
 *                 format: uri
 *           example:
 *             newEmail: a.okafor@nexacare.health
 *     responses:
 *       200:
 *         description: The address was changed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       400:
 *         description: The address is malformed or already belongs to another account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: COULDNT_UPDATE_YOUR_EMAIL
 *                 message: Couldn't update your email
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/update-user:
 *   post:
 *     tags: [Authentication]
 *     summary: Update the signed-in user's own profile
 *     description: >
 *       Self-service edit of display name, avatar and phone number. Role,
 *       activation state and email are deliberately not editable here — they go
 *       through `PATCH /api/users/{id}/role`, `PATCH /api/users/{id}/active` and
 *       `POST /api/auth/change-email` respectively.
 *     operationId: authUpdateUser
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               image:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *           example:
 *             name: Dr. Amara Okafor, FMCP
 *             phone: '+2348011113333'
 *     responses:
 *       200:
 *         description: The profile was updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/send-verification-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Send an email-verification link
 *     description: >
 *       Issues a verification token valid for one hour. Verification is not sent
 *       automatically on sign-up and is not required to sign in, so this is only
 *       needed where a deployment wants verified addresses.
 *     operationId: authSendVerificationEmail
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               callbackURL:
 *                 type: string
 *                 format: uri
 *           example:
 *             email: ngozi.adeyemi@example.com
 *             callbackURL: https://nexa-care-sooty.vercel.app/verified
 *     responses:
 *       200:
 *         description: The request was accepted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/verify-email:
 *   get:
 *     tags: [Authentication]
 *     summary: Verify an email address
 *     description: >
 *       Consumes the token from a verification link and marks the address
 *       verified. The user is signed in automatically once verification
 *       succeeds. With a `callbackURL` the endpoint answers `302` and redirects
 *       there; without one it answers `200` with a JSON body.
 *     operationId: authVerifyEmail
 *     security: []
 *     parameters:
 *       - name: token
 *         in: query
 *         required: true
 *         description: Verification token from the emailed link.
 *         schema:
 *           type: string
 *       - name: callbackURL
 *         in: query
 *         required: false
 *         description: Where to redirect once the address is verified.
 *         schema:
 *           type: string
 *           format: uri
 *     responses:
 *       200:
 *         description: The address was verified.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/SessionUser'
 *             example:
 *               status: true
 *       302:
 *         description: The address was verified and the caller was redirected to `callbackURL`.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               format: uri
 *       400:
 *         description: The token is invalid, already used or expired.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: INVALID_TOKEN
 *                 message: Invalid or expired token
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/sign-in/social:
 *   post:
 *     tags: [Authentication]
 *     summary: Start an OAuth sign-in
 *     description: >
 *       Returns the provider's authorization URL for the browser to follow. Only
 *       available when the deployment has OAuth credentials configured; Google
 *       is the sole provider wired up, and it is a trusted provider, so an OAuth
 *       identity is linked automatically to an existing account with the same
 *       verified email.
 *     operationId: authSignInSocial
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google]
 *               callbackURL:
 *                 type: string
 *                 format: uri
 *                 description: Where to land after the provider redirects back.
 *               errorCallbackURL:
 *                 type: string
 *                 format: uri
 *           example:
 *             provider: google
 *             callbackURL: https://nexa-care-sooty.vercel.app/dashboard
 *     responses:
 *       200:
 *         description: The authorization URL to redirect the browser to.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                 redirect:
 *                   type: boolean
 *             example:
 *               url: https://accounts.google.com/o/oauth2/auth?client_id=...
 *               redirect: true
 *       400:
 *         description: The provider is unknown or not configured on this deployment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: PROVIDER_NOT_FOUND
 *                 message: Provider not found
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/callback/{provider}:
 *   get:
 *     tags: [Authentication]
 *     summary: OAuth redirect target
 *     description: >
 *       Where the identity provider sends the browser back after consent.
 *       Exchanges the authorization code for tokens, creates or links the local
 *       account, starts a session and redirects on to the `callbackURL` given at
 *       the start of the flow. Called by the provider, never directly by an
 *       application.
 *     operationId: authOAuthCallback
 *     security: []
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         description: Identity provider id.
 *         schema:
 *           type: string
 *           enum: [google]
 *       - name: code
 *         in: query
 *         required: false
 *         description: Authorization code issued by the provider.
 *         schema:
 *           type: string
 *       - name: state
 *         in: query
 *         required: false
 *         description: Opaque CSRF state issued when the flow started.
 *         schema:
 *           type: string
 *       - name: error
 *         in: query
 *         required: false
 *         description: Set instead of `code` when the user declined consent.
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Session established; the browser is redirected to the original `callbackURL`.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               format: uri
 *           Set-Cookie:
 *             description: Session cookie for the newly established session.
 *             schema:
 *               type: string
 *       400:
 *         description: The state or code is missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: INVALID_STATE
 *                 message: Invalid state
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/list-accounts:
 *   get:
 *     tags: [Authentication]
 *     summary: List linked sign-in methods
 *     description: >
 *       The credential and OAuth identities attached to the signed-in user.
 *       `providerId` is `credential` for email/password and the provider id for
 *       social logins.
 *     operationId: authListAccounts
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Linked accounts.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   providerId:
 *                     type: string
 *                     example: credential
 *                   accountId:
 *                     type: string
 *                   scopes:
 *                     type: array
 *                     items:
 *                       type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *             example:
 *               - id: b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e
 *                 providerId: credential
 *                 accountId: 6d5c4b3a-2e1f-4a09-8b7c-6d5e4f3a2b1c
 *                 scopes: []
 *                 createdAt: '2026-01-14T09:12:44.000Z'
 *                 updatedAt: '2026-01-14T09:12:44.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/link-social:
 *   post:
 *     tags: [Authentication]
 *     summary: Link an OAuth identity to the current account
 *     description: >
 *       Starts a consent flow that attaches a provider identity to the
 *       signed-in account, letting the same person sign in either way.
 *     operationId: authLinkSocial
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google]
 *               callbackURL:
 *                 type: string
 *                 format: uri
 *           example:
 *             provider: google
 *             callbackURL: https://nexa-care-sooty.vercel.app/settings
 *     responses:
 *       200:
 *         description: The authorization URL to redirect the browser to.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                 redirect:
 *                   type: boolean
 *             example:
 *               url: https://accounts.google.com/o/oauth2/auth?client_id=...
 *               redirect: true
 *       400:
 *         description: The provider is unknown or not configured on this deployment.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: PROVIDER_NOT_FOUND
 *                 message: Provider not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @openapi
 * /api/auth/unlink-account:
 *   post:
 *     tags: [Authentication]
 *     summary: Unlink a sign-in method
 *     description: >
 *       Detaches a provider identity from the account. The last remaining
 *       sign-in method cannot be removed — that would lock the user out.
 *     operationId: authUnlinkAccount
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [providerId]
 *             properties:
 *               providerId:
 *                 type: string
 *                 example: google
 *               accountId:
 *                 type: string
 *                 description: Needed only when several identities share a provider.
 *           example:
 *             providerId: google
 *     responses:
 *       200:
 *         description: The identity was unlinked.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *             example:
 *               status: true
 *       400:
 *         description: No such linked identity, or it is the only sign-in method left.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FAILED_TO_UNLINK_LAST_ACCOUNT
 *                 message: You can't unlink your last account
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
