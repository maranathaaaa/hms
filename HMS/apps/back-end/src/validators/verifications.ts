import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod/schema";
import type { z } from "zod";

import { verifications } from "../database/schema/verifications.ts";

export const insertVerificationSchema = createInsertSchema(verifications);
export const selectVerificationSchema = createSelectSchema(verifications);
export const updateVerificationSchema = createUpdateSchema(verifications);

export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type SelectVerification = z.infer<typeof selectVerificationSchema>;
export type UpdateVerification = z.infer<typeof updateVerificationSchema>;
