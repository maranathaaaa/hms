import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PatientsPage } from "../../../views/patients.tsx";

const patientsSearchSchema = z.object({
	search: z.string().optional(),
});

export const Route = createFileRoute("/_app/super-admin/patients")({
	validateSearch: patientsSearchSchema,
	component: PatientsPage,
});
