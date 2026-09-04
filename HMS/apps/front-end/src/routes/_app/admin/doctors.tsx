import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { DoctorsPage } from "../../../views/doctors.tsx";

const doctorsSearchSchema = z.object({
	search: z.string().optional(),
});

export const Route = createFileRoute("/_app/admin/doctors")({
	validateSearch: doctorsSearchSchema,
	component: DoctorsPage,
});
