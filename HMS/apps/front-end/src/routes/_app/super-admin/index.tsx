import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/super-admin/")({
	component: () => <Navigate to="/super-admin/dashboard" replace />,
});
