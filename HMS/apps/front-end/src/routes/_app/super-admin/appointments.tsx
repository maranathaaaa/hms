import { createFileRoute } from "@tanstack/react-router";

import { AppointmentsPage } from "../../../views/appointments.tsx";

export const Route = createFileRoute("/_app/super-admin/appointments")({
	component: AppointmentsPage,
});
