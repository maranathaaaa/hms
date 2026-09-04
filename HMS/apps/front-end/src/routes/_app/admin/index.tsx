import { Navigate, createFileRoute } from "@tanstack/react-router";
import "./admin.css";

export const Route = createFileRoute("/_app/admin/")({
	component: () => <Navigate to="/admin/dashboard" replace />,
});
