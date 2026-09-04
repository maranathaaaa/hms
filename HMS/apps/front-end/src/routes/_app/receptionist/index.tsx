import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/receptionist/")({
	component: () => <Navigate to="/receptionist/dashboard" replace />,
});
