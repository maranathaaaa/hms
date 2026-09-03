import { APIError } from "better-auth/api";
import { DrizzleQueryError } from "drizzle-orm";
import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";

import { isProduction } from "../config/env.ts";
import { AppError } from "../lib/errors.ts";
import { logger } from "../lib/logger.ts";

export const notFoundHandler: RequestHandler = (req, res) => {
	res.status(404).json({
		error: {
			code: "NOT_FOUND",
			message: `Cannot ${req.method} ${req.path}`,
		},
	});
};

/** Maps a Postgres error code + constraint name onto an HTTP response. */
function fromPostgres(error: {
	code?: string;
	constraint?: string;
	detail?: string;
}) {
	switch (error.code) {
		case "23505": // unique_violation
			return {
				status: 409,
				code: "DUPLICATE",
				message: "A record with these details already exists",
			};
		case "23503": // foreign_key_violation
			return {
				status: 422,
				code: "INVALID_REFERENCE",
				message: "Referenced record does not exist",
			};
		case "23514": // check_violation
			return {
				status: 422,
				code: "CONSTRAINT_VIOLATION",
				message: `Constraint "${error.constraint}" was violated`,
			};
		case "23P01": // exclusion_violation — the no-double-booking constraint
			return {
				status: 409,
				code: "SLOT_UNAVAILABLE",
				message: "That doctor already has an appointment overlapping this slot",
			};
		case "23502": // not_null_violation
			return {
				status: 422,
				code: "MISSING_FIELD",
				message: "A required field was missing",
			};
		default:
			return null;
	}
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
	// Multer upload failures.
	if (error instanceof multer.MulterError) {
		res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
			error: {
				code: "UPLOAD_ERROR",
				message:
					error.code === "LIMIT_FILE_SIZE"
						? "File exceeds the 5 MB size limit"
						: error.message,
			},
		});
		return;
	}

	if (
		error instanceof Error &&
		error.message === "Only PDF and image files are allowed"
	) {
		res.status(400).json({
			error: { code: "UPLOAD_ERROR", message: error.message },
		});
		return;
	}

	// Zod escaping a handler that didn't go through `validate()`.
	if (error instanceof z.ZodError) {
		res.status(422).json({
			error: {
				code: "VALIDATION_ERROR",
				message: "Request validation failed",
				details: z.treeifyError(error),
			},
		});
		return;
	}

	if (error instanceof AppError) {
		res.status(error.statusCode).json({
			error: {
				code: error.code,
				message: error.message,
				...(error.details !== undefined ? { details: error.details } : {}),
			},
		});
		return;
	}

	// Errors thrown by Better Auth handlers or by our own auth hooks.
	if (error instanceof APIError) {
		const status = Number(error.statusCode) || 500;
		res.status(status).json({
			error: {
				code: error.body?.code ?? "AUTH_ERROR",
				message: error.body?.message ?? error.message,
			},
		});
		return;
	}

	const pgError =
		error instanceof DrizzleQueryError
			? (error.cause as { code?: string; constraint?: string } | undefined)
			: (error as { code?: string; constraint?: string });

	const mapped = pgError ? fromPostgres(pgError) : null;

	if (mapped) {
		logger.warn(
			{ err: error, path: req.path, constraint: pgError?.constraint },
			"database constraint rejected the request",
		);
		res.status(mapped.status).json({
			error: { code: mapped.code, message: mapped.message },
		});
		return;
	}

	logger.error({ err: error, path: req.path }, "unhandled error");

	res.status(500).json({
		error: {
			code: "INTERNAL_ERROR",
			message: "Something went wrong on our end",
			...(isProduction
				? {}
				: { details: error instanceof Error ? error.stack : String(error) }),
		},
	});
};
