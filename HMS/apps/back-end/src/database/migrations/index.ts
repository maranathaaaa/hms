import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { sql } from "drizzle-orm";

import { db } from "../../config/db.ts";
import { logger } from "../../lib/logger.ts";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../../../drizzle");

const MIGRATION_STATEMENT_SEPARATOR = "--> statement-breakpoint";

async function ensureLogTable(): Promise<void> {
	await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "__migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamp with time zone NOT NULL DEFAULT now()
    );
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
	const rows = await db.execute<{ name: string }>(
		sql`SELECT "name" FROM "__migrations"`,
	);
	return new Set(rows.rows.map((row) => row.name));
}

async function loadSqlFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const names: string[] = [];

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const nested = await readdir(path.join(dir, entry.name));
			const migration = nested.find((file) => file === "migration.sql");
			if (migration) names.push(path.join(entry.name, migration));
		} else if (entry.isFile() && entry.name.endsWith(".sql")) {
			names.push(entry.name);
		}
	}

	return names.sort((a, b) => a.localeCompare(b));
}

export async function runMigrations(): Promise<void> {
	await ensureLogTable();

	const done = await appliedMigrations();
	const files = await loadSqlFiles(MIGRATIONS_DIR);
	const pending = files.filter((file) => !done.has(file));

	if (pending.length === 0) {
		logger.info("migrations: nothing to apply");
		return;
	}

	for (const file of pending) {
		const sqlText = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

		const statements = sqlText
			.split(MIGRATION_STATEMENT_SEPARATOR)
			.map((statement) => statement.trim())
			.filter(Boolean);

		await db.transaction(async (tx) => {
			for (const statement of statements) {
				await tx.execute(sql.raw(statement));
			}
			await tx.execute(
				sql`INSERT INTO "__migrations" ("name") VALUES (${file})`,
			);
		});

		logger.info({ file }, "migrations: applied");
	}
}
