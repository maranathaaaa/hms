import { createFileRoute } from "@tanstack/react-router";

import { MedicalRecordsPage } from "../../../views/medical-records.tsx";

export const Route = createFileRoute("/_app/admin/medical-records")({
	component: MedicalRecordsPage,
});
