/** Errors the global handler knows how to turn into a clean JSON response. */
export class AppError extends Error {
	constructor(
		readonly statusCode: number,
		readonly code: string,
		message: string,
		readonly details?: unknown,
	) {
		super(message);
		this.name = new.target.name;
		Error.captureStackTrace?.(this, new.target);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = "Authentication required", details?: unknown) {
		super(401, "UNAUTHORIZED", message, details);
	}
}

export class ForbiddenError extends AppError {
	constructor(
		message = "You do not have access to this resource",
		details?: unknown,
	) {
		super(403, "FORBIDDEN", message, details);
	}
}

export class NotFoundError extends AppError {
	constructor(resource = "Resource") {
		super(404, "NOT_FOUND", `${resource} not found`);
	}
}

export class ConflictError extends AppError {
	constructor(message: string, details?: unknown) {
		super(409, "CONFLICT", message, details);
	}
}

export class ValidationError extends AppError {
	constructor(details: unknown, message = "Request validation failed") {
		super(422, "VALIDATION_ERROR", message, details);
	}
}
