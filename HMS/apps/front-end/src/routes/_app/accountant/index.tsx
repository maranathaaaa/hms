import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/accountant/")({
	component: () => <Navigate to="/accountant/dashboard" replace />,
});
