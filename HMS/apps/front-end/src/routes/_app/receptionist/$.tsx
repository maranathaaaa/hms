import { createFileRoute } from "@tanstack/react-router";

import { NotFoundPage } from "../../../views/not-found.tsx";

export const Route = createFileRoute("/_app/receptionist/$")({
	component: NotFoundPage,
});
