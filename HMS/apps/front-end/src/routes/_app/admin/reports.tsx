import { createFileRoute } from "@tanstack/react-router";

import { ReportsPage } from "../../../views/reports.tsx";

export const Route = createFileRoute("/_app/admin/reports")({
	component: ReportsPage,
});
