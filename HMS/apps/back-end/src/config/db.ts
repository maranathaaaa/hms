import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../database/schema/index.ts";
import { relations } from "../database/schema/relations.ts";
import { env } from "./env.ts";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: env.DATABASE_POOL_MAX,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 10_000,
});

export const db = drizzle({
	client: pool,
	relations,
	logger: env.NODE_ENV === "development",
});

/** Raw table objects — handed to the Better Auth Drizzle adapter. */
export { pool, schema };

export type Database = typeof db;
