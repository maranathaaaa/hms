import pino from "pino";

import { isProduction } from "../config/env.ts";

export const logger = pino({
	level: isProduction ? "info" : "debug",
	/**
	 * Auth payloads carry passwords and bearer tokens. Redact before anything
	 * reaches a log sink.
	 */
	redact: {
		paths: [
			"req.headers.authorization",
			"req.headers.cookie",
			"res.headers['set-cookie']",
			"*.password",
			"*.confirmPassword",
			"*.currentPassword",
			"*.token",
			"*.accessToken",
			"*.refreshToken",
			"*.idToken",
		],
		censor: "[redacted]",
	},
	transport: isProduction
		? undefined
		: { target: "pino/file", options: { destination: 1 } },
});
