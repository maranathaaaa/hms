import type { Permission, RoleName } from "../constants/index.ts";
import type { Session, User } from "../database/schema/index.ts";

/** The authenticated principal attached to a request by `requireAuth`. */
export interface AuthContext {
	user: Omit<User, "deletedAt">;
	session: Session;
	role: RoleName;
	permissions: readonly Permission[];
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			/** Present only after `requireAuth` (or `optionalAuth`, where it may be undefined). */
			auth?: AuthContext;
			/** Populated by `validate()` from the middleware layer. */
			validated?: {
				body?: unknown;
				query?: unknown;
				params?: unknown;
			};
		}
	}
}

export interface PaginatedResult<T> {
	data: T[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface ApiError {
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
}
