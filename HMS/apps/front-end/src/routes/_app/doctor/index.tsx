import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/doctor/")({
	component: () => <Navigate to="/doctor/dashboard" replace />,
});
