import { createFileRoute } from "@tanstack/react-router";

import { AppointmentCalendarPage } from "../../../views/appointment-calendar.tsx";

export const Route = createFileRoute("/_app/receptionist/calendar")({
	component: AppointmentCalendarPage,
});
