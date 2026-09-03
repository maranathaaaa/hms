import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),

	PORT: z.coerce.number().int().positive().default(3001),

	DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

	DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),

	BETTER_AUTH_SECRET: z.string().min(32),

	BETTER_AUTH_URL: z.url().default("http://localhost:3001"),

	CORS_ORIGINS: z
		.string()
		.default("http://localhost:5173,https://nexa-care-sooty.vercel.app")
		.transform((value) =>
			value
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
		),

	ALLOW_PUBLIC_SIGNUP: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),

	COOKIE_DOMAIN: z.string().optional(),

	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	SEED_ADMIN_EMAIL: z.email().default("admin@hospital.local"),
	SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment configuration:");
	console.error(z.prettifyError(parsed.error));
	process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
