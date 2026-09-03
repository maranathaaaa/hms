import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/zod/schema";
import type { z } from "zod";

import { roles } from "../database/schema/roles.ts";

export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export const updateRoleSchema = createUpdateSchema(roles);

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type SelectRole = z.infer<typeof selectRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
