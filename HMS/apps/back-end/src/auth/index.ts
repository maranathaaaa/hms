import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { and, eq, isNull } from "drizzle-orm";

import { db, schema } from "../config/db.ts";
import { env, isProduction } from "../config/env.ts";
import {
	DEFAULT_ROLE,
	PASSWORD,
	ROLES,
	type RoleName,
	SESSION,
} from "../constants/index.ts";
import { roles, users } from "../database/schema/index.ts";
import { writeAuditLog } from "../lib/audit.ts";

const roleIdCache = new Map<RoleName, number>();

export async function getRoleId(name: RoleName): Promise<number> {
	const cached = roleIdCache.get(name);
	if (cached !== undefined) return cached;

	const [row] = await db
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, name))
		.limit(1);

	if (!row) {
		throw new Error(
			`Role "${name}" is missing from the roles table. Run \`bun run db:seed\`.`,
		);
	}

	roleIdCache.set(name, row.id);
	return row.id;
}

export async function getRoleName(roleId: number): Promise<RoleName> {
	for (const [name, id] of roleIdCache) {
		if (id === roleId) return name;
	}

	const [row] = await db
		.select({ name: roles.name })
		.from(roles)
		.where(eq(roles.id, roleId))
		.limit(1);

	if (!row) throw new Error(`Unknown role id: ${roleId}`);

	const name = row.name as RoleName;
	roleIdCache.set(name, roleId);
	return name;
}

export const auth = betterAuth({
	appName: "HMS",

	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	basePath: "/api/auth",

	trustedOrigins: env.CORS_ORIGINS,

	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
		usePlural: true,
		transaction: true,
	}),

	advanced: {
		database: {
			generateId: "uuid",
		},
		cookiePrefix: "hms",
		useSecureCookies: isProduction,
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: isProduction ? "none" : "lax",
			secure: isProduction,
			...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
		},
	},

	emailAndPassword: {
		enabled: true,
		minPasswordLength: PASSWORD.MIN_LENGTH,
		maxPasswordLength: PASSWORD.MAX_LENGTH,
		requireEmailVerification: false,
		autoSignIn: false,
		resetPasswordTokenExpiresIn: 60 * 15,
	},

	emailVerification: {
		sendOnSignUp: false,
		autoSignInAfterVerification: true,
		expiresIn: 60 * 60,
	},

	socialProviders:
		env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
					},
				}
			: undefined,

	session: {
		expiresIn: SESSION.EXPIRES_IN,
		updateAge: SESSION.UPDATE_AGE,
		cookieCache: {
			enabled: true,
			maxAge: SESSION.COOKIE_CACHE_MAX_AGE,
		},
		freshAge: 60 * 15,
	},

	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
	},

	user: {
		additionalFields: {
			roleId: {
				type: "number",
				required: false,
				input: false,
				returned: true,
			},
			phone: {
				type: "string",
				required: false,
				input: true,
				returned: true,
			},
			isActive: {
				type: "boolean",
				required: false,
				input: false,
				returned: true,
				defaultValue: true,
			},
			lastLoginAt: {
				type: "date",
				required: false,
				input: false,
				returned: false,
			},
			deletedAt: {
				type: "date",
				required: false,
				input: false,
				returned: false,
			},
		},
		changeEmail: { enabled: true },
		deleteUser: { enabled: false },
	},

	databaseHooks: {
		user: {
			create: {
				before: async (user) => ({
					data: {
						...user,
						roleId:
							(user as { roleId?: number }).roleId ??
							(await getRoleId(DEFAULT_ROLE)),
					},
				}),
			},
		},

		session: {
			create: {
				before: async (session) => {
					const [account] = await db
						.select({ id: users.id, isActive: users.isActive })
						.from(users)
						.where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
						.limit(1);

					if (!account) {
						throw new APIError("UNAUTHORIZED", {
							message: "Account not found",
						});
					}

					if (!account.isActive) {
						throw new APIError("FORBIDDEN", {
							message: "This account has been deactivated",
						});
					}

					await db
						.update(users)
						.set({ lastLoginAt: new Date() })
						.where(eq(users.id, session.userId));

					await writeAuditLog({
						userId: session.userId,
						action: "LOGIN",
						tableName: "users",
						recordId: session.userId,
					});

					return { data: session };
				},
			},

			delete: {
				before: async (session) => {
					await writeAuditLog({
						userId: session.userId,
						action: "LOGOUT",
						tableName: "users",
						recordId: session.userId,
					});
				},
			},
		},
	},

	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path !== "/sign-up/email") return;
			if (env.ALLOW_PUBLIC_SIGNUP) return;

			const session = await auth.api
				.getSession({ headers: ctx.headers ?? new Headers() })
				.catch(() => null);

			const roleId = (session?.user as { roleId?: number } | undefined)?.roleId;
			const roleName = roleId ? await getRoleName(roleId) : null;

			if (roleName !== ROLES.ADMIN && roleName !== ROLES.SUPER_ADMIN) {
				throw new APIError("FORBIDDEN", {
					message: "Sign-up is disabled. Ask an administrator for an account.",
				});
			}
		}),
	},

	rateLimit: {
		enabled: true,
		window: 60,
		max: 20,
		customRules: {
			"/sign-in/email": { window: 60, max: 5 },
			"/sign-up/email": { window: 60, max: 3 },
			"/forget-password": { window: 60 * 15, max: 3 },
			"/reset-password": { window: 60 * 15, max: 5 },
		},
	},

	telemetry: { enabled: false },
});

export type Auth = typeof auth;
export type AuthSession = Auth["$Infer"]["Session"];
