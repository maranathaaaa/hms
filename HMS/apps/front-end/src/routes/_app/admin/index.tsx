import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/")({
	component: () => <Navigate to="/admin/dashboard" replace />,
});
