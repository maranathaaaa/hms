import { Navigate, createFileRoute } from "@tanstack/react-router";
import "./receptionist.css";

export const Route = createFileRoute("/_app/receptionist/")({
	component: () => <Navigate to="/receptionist/dashboard" replace />,
});
