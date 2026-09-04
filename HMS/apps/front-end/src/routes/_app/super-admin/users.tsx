import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "../../../views/users.tsx";

export const Route = createFileRoute("/_app/super-admin/users")({
	component: UsersPage,
});
