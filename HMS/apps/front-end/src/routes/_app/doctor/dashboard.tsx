import { createFileRoute } from "@tanstack/react-router";

import { DashboardPage } from "../../../views/dashboard.tsx";

export const Route = createFileRoute("/_app/doctor/dashboard")({
	component: DashboardPage,
});
