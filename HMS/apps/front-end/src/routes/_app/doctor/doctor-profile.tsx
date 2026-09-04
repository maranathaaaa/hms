import { createFileRoute } from "@tanstack/react-router";

import { DoctorProfilePage } from "../../../views/doctor-profile.tsx";

export const Route = createFileRoute("/_app/doctor/doctor-profile")({
	component: DoctorProfilePage,
});
