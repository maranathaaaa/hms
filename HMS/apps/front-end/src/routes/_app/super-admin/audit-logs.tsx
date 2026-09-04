import { createFileRoute } from "@tanstack/react-router";

import { AuditLogsPage } from "../../../views/audit-logs.tsx";

export const Route = createFileRoute("/_app/super-admin/audit-logs")({
	component: AuditLogsPage,
});
