import { createFileRoute } from "@tanstack/react-router";

import { AppointmentsPage } from "../../../views/appointments.tsx";

export const Route = createFileRoute("/_app/receptionist/appointments")({
	component: AppointmentsPage,
});
