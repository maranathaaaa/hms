import { Navigate, createFileRoute } from "@tanstack/react-router";
import "./accountant.css";

export const Route = createFileRoute("/_app/accountant/")({
	component: () => <Navigate to="/accountant/dashboard" replace />,
});
