import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

import multer from "multer";

/** Reports land here; served statically at `/uploads`. */
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		cb(null, `${randomUUID()}${ext}`);
	},
});

export const upload = multer({
	storage,
	limits: { fileSize: MAX_FILE_SIZE, files: 1 },
	fileFilter: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
			cb(new Error("Only PDF and image files are allowed"));
			return;
		}
		cb(null, true);
	},
});
