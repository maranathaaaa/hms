import { Navigate, createFileRoute } from "@tanstack/react-router";
import "./super-admin.css";

export const Route = createFileRoute("/_app/super-admin/")({
	component: () => <Navigate to="/super-admin/dashboard" replace />,
});
