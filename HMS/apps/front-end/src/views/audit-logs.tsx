import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Badge } from "../components/ui/badge.tsx";
import { Card } from "../components/ui/card.tsx";
import { Select } from "../components/ui/field.tsx";
import {
	EmptyState,
	InlineError,
	PageHeader,
	Spinner,
} from "../components/ui/page.tsx";
import { Pagination } from "../components/ui/pagination.tsx";
import { SortableTh, useSort } from "../components/ui/sortable-th.tsx";
import {
	Table,
	TableBody,
	TableHead,
	TableRow,
	Td,
} from "../components/ui/table.tsx";
import { api } from "../lib/api.ts";
import { AUDIT_ACTION_TONE } from "../lib/status.ts";
import type { AuditLog, Paginated } from "../lib/types.ts";
import { formatDateTime, titleCase } from "../lib/utils.ts";

const LIMIT = 20;

export function AuditLogsPage() {
	const [page, setPage] = useState(1);
	const [action, setAction] = useState("");

	const { data, isLoading, error } = useQuery({
		queryKey: ["audit-logs", page, action],
		queryFn: () =>
			api.get<Paginated<AuditLog>>("/api/audit-logs", {
				page,
				limit: LIMIT,
				action: action || undefined,
			}),
	});

	const logs = data?.data ?? [];
	const meta = data?.meta;

	const { sorted, key, dir, toggle } = useSort(logs, "createdAt");

	return (
		<div className="space-y-5">
			<PageHeader
				title="Audit Logs"
				subtitle="A record of every create, update and delete across the system"
			/>

			<Card>
				<div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
					<label className="text-sm font-medium text-slate-600">Action</label>
					<Select
						value={action}
						onChange={(e) => {
							setPage(1);
							setAction(e.target.value);
						}}
						className="w-40"
					>
						<option value="">All actions</option>
						<option value="CREATE">Create</option>
						<option value="UPDATE">Update</option>
						<option value="DELETE">Delete</option>
					</Select>
				</div>

				{isLoading ? <Spinner /> : null}
				{error ? (
					<InlineError
						message={
							error instanceof Error
								? error.message
								: "Failed to load audit logs"
						}
					/>
				) : null}

				{!isLoading && !error && logs.length === 0 ? (
					<EmptyState
						title="No audit events yet"
						description="Actions taken on records will appear here."
					/>
				) : null}

				{!isLoading && !error && logs.length > 0 ? (
					<>
						<Table>
							<TableHead>
								<SortableTh
									field="createdAt"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									When
								</SortableTh>
								<SortableTh
									field="actorName"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Actor
								</SortableTh>
								<SortableTh
									field="action"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Action
								</SortableTh>
								<SortableTh
									field="tableName"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Table
								</SortableTh>
								<SortableTh
									field="recordId"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Record
								</SortableTh>
								<SortableTh
									field="ipAddress"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									IP address
								</SortableTh>
							</TableHead>
							<TableBody>
								{sorted.map((log) => (
									<TableRow key={log.id}>
										<Td className="whitespace-nowrap text-slate-500">
											{formatDateTime(log.createdAt)}
										</Td>
										<Td>
											<p className="font-medium text-slate-900">
												{log.actorName ?? "System"}
											</p>
											{log.actorEmail ? (
												<p className="text-xs text-slate-500">
													{log.actorEmail}
												</p>
											) : null}
										</Td>
										<Td>
											<Badge tone={AUDIT_ACTION_TONE[log.action]}>
												{log.action}
											</Badge>
										</Td>
										<Td className="text-slate-600">
											{titleCase(log.tableName)}
										</Td>
										<Td className="text-xs text-slate-500">
											{log.recordId ? log.recordId.slice(0, 8) + "…" : "—"}
										</Td>
										<Td className="text-slate-500">{log.ipAddress ?? "—"}</Td>
									</TableRow>
								))}
							</TableBody>
						</Table>
						<Pagination
							page={page}
							totalPages={meta?.totalPages ?? 1}
							onPageChange={setPage}
						/>
					</>
				) : null}
			</Card>
		</div>
	);
}
