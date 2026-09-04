import { useQuery } from "@tanstack/react-query";
import {
	Banknote,
	CalendarDays,
	ReceiptText,
	Stethoscope,
	Users,
} from "lucide-react";

import { Badge } from "../components/ui/badge.tsx";
import { Card, CardContent, CardHeader } from "../components/ui/card.tsx";
import { InlineError, PageHeader, Spinner } from "../components/ui/page.tsx";
import { StatCard } from "../components/ui/stat-card.tsx";
import {
	Table,
	TableBody,
	TableHead,
	TableRow,
	Td,
	Th,
} from "../components/ui/table.tsx";
import { api } from "../lib/api.ts";
import { BILL_STATUS_TONE } from "../lib/status.ts";
import type {
	Appointment,
	Bill,
	DashboardStats,
	Paginated,
} from "../lib/types.ts";
import { formatCurrency, formatDateTime, titleCase } from "../lib/utils.ts";

const STATUS_ORDER = [
	"PAID",
	"PENDING",
	"PARTIALLY_PAID",
	"CANCELLED",
	"REFUNDED",
] as const;
const APPT_STATUS_ORDER = [
	"SCHEDULED",
	"CHECKED_IN",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
	"NO_SHOW",
] as const;

function Distribution({
	title,
	items,
	total,
}: {
	title: string;
	items: Array<{ label: string; count: number }>;
	total: number;
}) {
	return (
		<Card>
			<CardHeader title={title} subtitle="Breakdown across records" />
			<CardContent className="space-y-3">
				{items.map((item) => {
					const pct = total === 0 ? 0 : Math.round((item.count / total) * 100);
					return (
						<div key={item.label}>
							<div className="flex items-center justify-between text-sm">
								<span className="text-slate-600">{item.label}</span>
								<span className="font-semibold text-slate-900">
									{item.count}
									<span className="ml-1.5 text-xs font-normal text-slate-400">
										{pct}%
									</span>
								</span>
							</div>
							<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
								<div
									className="h-full rounded-full bg-primary-600"
									style={{ width: `${pct}%` }}
								/>
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

export function ReportsPage() {
	const {
		data: statsData,
		isLoading: statsLoading,
		error: statsError,
	} = useQuery({
		queryKey: ["reports", "dashboard"],
		queryFn: () => api.get<{ data: DashboardStats }>("/api/dashboard"),
	});

	const {
		data: billsData,
		isLoading: billsLoading,
		error: billsError,
	} = useQuery({
		queryKey: ["reports", "bills"],
		queryFn: () =>
			api.get<Paginated<Bill>>("/api/bills", { page: 1, limit: 100 }),
	});

	const { data: apptsData } = useQuery({
		queryKey: ["reports", "appointments"],
		queryFn: () =>
			api.get<Paginated<Appointment>>("/api/appointments", {
				page: 1,
				limit: 100,
			}),
	});

	const stats = statsData?.data;
	const bills = billsData?.data ?? [];
	const appts = apptsData?.data ?? [];

	const billCounts = STATUS_ORDER.map((s) => ({
		label: titleCase(s),
		count: bills.filter((b) => b.status === s).length,
	}));
	const apptCounts = APPT_STATUS_ORDER.map((s) => ({
		label: titleCase(s),
		count: appts.filter((a) => a.status === s).length,
	}));

	const paidBills = bills
		.filter((b) => Number(b.amountPaid) > 0)
		.sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));

	const monthTotals = new Map<string, number>();
	for (const b of paidBills) {
		if (!b.paidAt) continue;
		const key = b.paidAt.slice(0, 7);
		monthTotals.set(key, (monthTotals.get(key) ?? 0) + Number(b.amountPaid));
	}
	const months = [...monthTotals.entries()]
		.sort((a, b) => b[0].localeCompare(a[0]))
		.slice(0, 6);
	const maxMonth = Math.max(...months.map(([, v]) => v), 1);

	const isLoading = statsLoading || billsLoading;
	const error = statsError ?? billsError;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Reports"
				subtitle="Revenue, billing and appointment analytics"
			/>

			{isLoading ? <Spinner /> : null}
			{error ? (
				<InlineError
					message={
						error instanceof Error ? error.message : "Failed to load reports"
					}
				/>
			) : null}

			{stats ? (
				<>
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
						<StatCard
							label="Patients"
							value={stats.totalPatients}
							icon={Users}
						/>
						<StatCard
							label="Doctors"
							value={stats.totalDoctors}
							icon={Stethoscope}
						/>
						<StatCard
							label="Today's Appointments"
							value={stats.todayAppointments}
							icon={CalendarDays}
						/>
						<StatCard
							label="Revenue (month)"
							value={formatCurrency(stats.monthlyRevenue)}
							icon={Banknote}
						/>
						<StatCard
							label="Outstanding"
							value={formatCurrency(stats.totalOutstanding)}
							icon={ReceiptText}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<Distribution
							title="Bills by status"
							items={billCounts}
							total={bills.length}
						/>
						<Distribution
							title="Appointments by status"
							items={apptCounts}
							total={appts.length}
						/>
					</div>

					<Card>
						<CardHeader
							title="Revenue by month"
							subtitle="Total payments collected"
						/>
						<CardContent>
							{months.length === 0 ? (
								<p className="text-sm text-slate-500">
									No payments recorded yet.
								</p>
							) : (
								<div className="space-y-3">
									{months.map(([month, value]) => {
										const pct = Math.round((value / maxMonth) * 100);
										return (
											<div key={month} className="flex items-center gap-3">
												<span className="w-14 shrink-0 text-sm font-medium text-slate-600">
													{month}
												</span>
												<div className="h-4 flex-1 overflow-hidden rounded-md bg-slate-100">
													<div
														className="h-full rounded-md bg-emerald-500/80"
														style={{ width: `${pct}%` }}
													/>
												</div>
												<span className="w-20 shrink-0 text-right text-sm font-semibold text-slate-900">
													{formatCurrency(value)}
												</span>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader
							title="Recent payments"
							subtitle="Latest collected amounts"
						/>
						{paidBills.length === 0 ? (
							<div className="px-5 py-10 text-center text-sm text-slate-500">
								No payments recorded yet.
							</div>
						) : (
							<Table>
								<TableHead>
									<Th>Patient</Th>
									<Th>Paid</Th>
									<Th>Method</Th>
									<Th>Status</Th>
									<Th>Date</Th>
								</TableHead>
								<TableBody>
									{paidBills.slice(0, 8).map((bill) => (
										<TableRow key={bill.id}>
											<Td className="font-medium text-slate-900">
												{bill.patientName}
											</Td>
											<Td className="font-medium text-emerald-700">
												{formatCurrency(bill.amountPaid)}
											</Td>
											<Td className="text-slate-600">
												{bill.paymentMethod
													? titleCase(bill.paymentMethod)
													: "—"}
											</Td>
											<Td>
												<Badge tone={BILL_STATUS_TONE[bill.status]}>
													{titleCase(bill.status)}
												</Badge>
											</Td>
											<Td className="whitespace-nowrap text-slate-500">
												{formatDateTime(bill.paidAt ?? bill.invoiceDate)}
											</Td>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Card>
				</>
			) : null}
		</div>
	);
}
