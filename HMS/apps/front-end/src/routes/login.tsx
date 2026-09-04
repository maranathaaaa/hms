import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "../views/login.tsx";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});
