import type { RequestHandler } from "express";
import type { z } from "zod";

import { ValidationError } from "../lib/errors.ts";

type Source = "body" | "query" | "params";

type Schemas = Partial<Record<Source, z.ZodType>>;

/**
 * Parse `body` / `query` / `params` against Zod schemas.
 *
 * Parsed output goes to `req.validated.*` rather than overwriting `req.query`,
 * which Express 5 exposes as a getter-only property. Read the coerced,
 * defaulted values from `req.validated`, not from the raw request.
 */
export const validate = (schemas: Schemas): RequestHandler => {
	return (req, _res, next) => {
		const issues: z.core.$ZodIssue[] = [];
		const validated: Record<string, unknown> = {};

		for (const source of ["body", "query", "params"] as const) {
			const schema = schemas[source];
			if (!schema) continue;

			const result = schema.safeParse(req[source] ?? {});

			if (result.success) {
				validated[source] = result.data;
			} else {
				issues.push(
					...result.error.issues.map((issue) => ({
						...issue,
						path: [source, ...issue.path],
					})),
				);
			}
		}

		if (issues.length > 0) {
			return next(
				new ValidationError(
					issues.map((issue) => ({
						path: issue.path.join("."),
						code: issue.code,
						message: issue.message,
					})),
				),
			);
		}

		req.validated = validated;

		// `body` is a plain writable property, so mirror it for ergonomics.
		if (validated.body !== undefined) {
			req.body = validated.body;
		}

		next();
	};
};

/** Typed accessor so handlers don't have to cast `req.validated`. */
export const validated = <T>(
	req: { validated?: Record<string, unknown> },
	source: Source,
): T => (req.validated?.[source] ?? {}) as T;
