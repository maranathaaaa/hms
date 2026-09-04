import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "../components/layout/AppShell.tsx";

function AppLayout() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});
