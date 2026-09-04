import { Navigate, createFileRoute } from "@tanstack/react-router";
import "./doctor.css";

export const Route = createFileRoute("/_app/doctor/")({
	component: () => <Navigate to="/doctor/dashboard" replace />,
});
