import { createFileRoute } from "@tanstack/react-router";

import { AppointmentsPage } from "../../../views/appointments.tsx";

export const Route = createFileRoute("/_app/accountant/appointments")({
	component: AppointmentsPage,
});
