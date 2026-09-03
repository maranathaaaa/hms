import { z } from "zod";

import type { AuthContext, PaginatedResult } from "../types/index.ts";

export interface PaginationParams {
	page: number;
	limit: number;
}

/** Shared `:id` route param validator. */
export const uuidParamSchema = z.object({ id: z.uuid() });

/** The actor identity services expect, lifted off an authenticated request. */
export function actorFrom(req: { auth?: AuthContext }): {
	id: string;
	role: AuthContext["role"];
} {
	return { id: req.auth!.user.id, role: req.auth!.role };
}

/** The validated `:id` param (safe after `validate` has run). */
export function paramId(req: { validated?: { params?: unknown } }): string {
	const params = (req.validated?.params ?? {}) as { id: string };
	return params.id;
}

export function paginate<T>(
	data: T[],
	total: number,
	params: PaginationParams,
): PaginatedResult<T> {
	return {
		data,
		meta: {
			page: params.page,
			limit: params.limit,
			total,
			totalPages: Math.ceil(total / params.limit),
		},
	};
}
