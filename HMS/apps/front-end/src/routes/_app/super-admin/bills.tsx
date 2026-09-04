import { createFileRoute } from "@tanstack/react-router";

import { BillsPage } from "../../../views/bills.tsx";

export const Route = createFileRoute("/_app/super-admin/bills")({
	component: BillsPage,
});
