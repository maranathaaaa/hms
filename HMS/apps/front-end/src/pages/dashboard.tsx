import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Banknote,
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	FileText,
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
import { authClient } from "../lib/auth-client.ts";
import { toISODate } from "../lib/calendar.ts";
import { APPOINTMENT_STATUS_TONE } from "../lib/status.ts";
import {
	type Appointment,
	type DashboardStats,
	type Doctor,
	type MedicalRecord,
	type Paginated,
	type Patient,
	ROLE_ID,
	type SessionUser,
} from "../lib/types.ts";
import {
	formatCurrency,
	formatDate,
	formatTime,
	titleCase,
} from "../lib/utils.ts";

export function DashboardPage() {
	const { data: session } = authClient.useSession();
	const roleId = (session?.user as SessionUser | undefined)?.roleId;

	if (roleId === ROLE_ID.DOCTOR) return <DoctorDashboard />;
	if (roleId === ROLE_ID.RECEPTIONIST || roleId === ROLE_ID.ACCOUNTANT) {
		return <ReceptionistDashboard />;
	}
	return <AdminDashboard />;
}

function AdminDashboard() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => api.get<{ data: DashboardStats }>("/api/dashboard"),
	});

	const stats = data?.data;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				subtitle="Overview of activity across the hospital"
			/>

			{isLoading ? <Spinner /> : null}
			{error ? (
				<InlineError
					message={
						error instanceof Error ? error.message : "Failed to load dashboard"
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
							label="Pending Bills"
							value={stats.pendingBills}
							icon={ClipboardList}
						/>
						<StatCard
							label="Revenue (month)"
							value={formatCurrency(stats.monthlyRevenue)}
							icon={Banknote}
						/>
					</div>

					<ScheduleAndBilling stats={stats} />
				</>
			) : null}
		</div>
	);
}

function DoctorDashboard() {
	const { data: profileData } = useQuery({
		queryKey: ["doctor", "me"],
		queryFn: () => api.get<{ data: Doctor }>("/api/doctors/me/profile"),
	});
	const doctorId = profileData?.data.id;
	const today = toISODate(new Date());

	const {
		data: todayData,
		isLoading: todayLoading,
		error: todayError,
	} = useQuery({
		queryKey: ["dashboard", "doctor", "today", doctorId],
		queryFn: () =>
			api.get<Paginated<Appointment>>("/api/appointments", {
				page: 1,
				limit: 200,
				doctorId,
				dateFrom: today,
				dateTo: today,
			}),
		enabled: Boolean(doctorId),
	});

	const { data: allData } = useQuery({
		queryKey: ["dashboard", "doctor", "all", doctorId],
		queryFn: () =>
			api.get<Paginated<Appointment>>("/api/appointments", {
				page: 1,
				limit: 100,
				doctorId,
			}),
		enabled: Boolean(doctorId),
	});

	const { data: recordsData } = useQuery({
		queryKey: ["dashboard", "doctor", "records", doctorId],
		queryFn: () =>
			api.get<Paginated<MedicalRecord>>("/api/medical-records", {
				page: 1,
				limit: 5,
				doctorId,
			}),
		enabled: Boolean(doctorId),
	});

	const allAppts = allData?.data ?? [];
	const assigned = new Map<string, string>();
	for (const a of allAppts) {
		if (!assigned.has(a.patientId)) assigned.set(a.patientId, a.patientName);
	}
	const completedVisits = allAppts.filter(
		(a) => a.status === "COMPLETED",
	).length;

	const todayAppts = todayData?.data ?? [];

	return (
		<div className="space-y-6">
			<PageHeader
				title="My dashboard"
				subtitle={`Welcome back, ${profileData?.data.name ?? "doctor"}`}
			/>

			{todayLoading ? <Spinner /> : null}
			{todayError ? (
				<InlineError
					message={
						todayError instanceof Error
							? todayError.message
							: "Failed to load schedule"
					}
				/>
			) : null}

			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard
					label="Today's Appointments"
					value={todayAppts.length}
					icon={CalendarDays}
				/>
				<StatCard
					label="Assigned Patients"
					value={assigned.size}
					icon={Users}
				/>
				<StatCard
					label="Completed Visits"
					value={completedVisits}
					icon={CheckCircle2}
				/>
				<StatCard
					label="Recent Records"
					value={recordsData?.data.length ?? 0}
					icon={FileText}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader
						title="Today's schedule"
						subtitle="Your appointments for today"
						actions={
							<Link
								to="/appointments"
								className="text-sm font-medium text-primary-600 hover:text-primary-700"
							>
								View all
							</Link>
						}
					/>
					{todayAppts.length === 0 ? (
						<div className="px-5 py-10 text-center text-sm text-slate-500">
							You have no appointments scheduled for today.
						</div>
					) : (
						<Table>
							<TableHead>
								<Th>Time</Th>
								<Th>Patient</Th>
								<Th>Status</Th>
							</TableHead>
							<TableBody>
								{todayAppts.map((item) => (
									<TableRow key={item.id}>
										<Td className="font-medium whitespace-nowrap text-slate-900">
											{formatTime(item.startTime)} – {formatTime(item.endTime)}
										</Td>
										<Td>
											<p className="font-medium text-slate-900">
												{item.patientName}
											</p>
											{item.reason ? (
												<p className="text-xs text-slate-500">{item.reason}</p>
											) : null}
										</Td>
										<Td>
											<Badge tone={APPOINTMENT_STATUS_TONE[item.status]}>
												{titleCase(item.status)}
											</Badge>
										</Td>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</Card>

				<Card>
					<CardHeader title="Assigned patients" />
					<CardContent>
						{assigned.size === 0 ? (
							<p className="text-sm text-slate-500">
								No patients assigned yet.
							</p>
						) : (
							<ul className="divide-y divide-slate-200">
								{[...assigned.entries()].slice(0, 6).map(([id, name]) => (
									<li
										key={id}
										className="flex items-center gap-2 py-2 text-sm text-slate-700"
									>
										<span className="size-1.5 rounded-full bg-primary-500" />
										{name}
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader
					title="Recent medical records"
					actions={
						<Link
							to="/medical-records"
							className="text-sm font-medium text-primary-600 hover:text-primary-700"
						>
							View all
						</Link>
					}
				/>
				{recordsData?.data.length === 0 || !recordsData ? (
					<div className="px-5 py-8 text-center text-sm text-slate-500">
						No medical records yet.
					</div>
				) : (
					<Table>
						<TableHead>
							<Th>Patient</Th>
							<Th>Diagnosis</Th>
							<Th>Updated</Th>
						</TableHead>
						<TableBody>
							{recordsData.data.map((record) => (
								<TableRow key={record.id}>
									<Td className="font-medium text-slate-900">
										{record.patientName}
									</Td>
									<Td
										className="max-w-56 truncate text-slate-600"
										title={record.diagnosis}
									>
										{record.diagnosis}
									</Td>
									<Td className="whitespace-nowrap text-slate-500">
										{formatDate(record.updatedAt)}
									</Td>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</Card>
		</div>
	);
}

function ReceptionistDashboard() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => api.get<{ data: DashboardStats }>("/api/dashboard"),
	});

	const { data: patientsData } = useQuery({
		queryKey: ["dashboard", "recent-patients"],
		queryFn: () =>
			api.get<Paginated<Patient>>("/api/patients", { page: 1, limit: 5 }),
	});

	const stats = data?.data;
	const recentPatients = patientsData?.data ?? [];

	return (
		<div className="space-y-6">
			<PageHeader
				title="Front desk dashboard"
				subtitle="Reception and scheduling overview"
			/>

			{isLoading ? <Spinner /> : null}
			{error ? (
				<InlineError
					message={
						error instanceof Error ? error.message : "Failed to load dashboard"
					}
				/>
			) : null}

			{stats ? (
				<>
					<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
						<StatCard
							label="Today's Appointments"
							value={stats.todayAppointments}
							icon={CalendarDays}
						/>
						<StatCard
							label="Pending Bills"
							value={stats.pendingBills}
							icon={ClipboardList}
						/>
						<StatCard
							label="Outstanding"
							value={formatCurrency(stats.totalOutstanding)}
							icon={ReceiptText}
						/>
						<StatCard
							label="Registered Patients"
							value={stats.totalPatients}
							icon={Users}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<Card className="lg:col-span-2">
							<CardHeader
								title="Today's schedule"
								subtitle="Upcoming appointments for today"
								actions={
									<Link
										to="/appointments"
										className="text-sm font-medium text-primary-600 hover:text-primary-700"
									>
										View all
									</Link>
								}
							/>
							{stats.todaySchedule.length === 0 ? (
								<div className="px-5 py-10 text-center text-sm text-slate-500">
									No appointments scheduled for today.
								</div>
							) : (
								<Table>
									<TableHead>
										<Th>Time</Th>
										<Th>Patient</Th>
										<Th>Doctor</Th>
										<Th>Status</Th>
									</TableHead>
									<TableBody>
										{stats.todaySchedule.map((item) => (
											<TableRow key={item.id}>
												<Td className="font-medium whitespace-nowrap text-slate-900">
													{formatTime(item.startTime)} –{" "}
													{formatTime(item.endTime)}
												</Td>
												<Td>{item.patientName}</Td>
												<Td>{item.doctorName}</Td>
												<Td>
													<Badge tone={APPOINTMENT_STATUS_TONE[item.status]}>
														{titleCase(item.status)}
													</Badge>
												</Td>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</Card>

						<Card>
							<CardHeader
								title="Newly registered"
								subtitle="Most recent patients"
							/>
							{recentPatients.length === 0 ? (
								<CardContent>
									<p className="text-sm text-slate-500">
										No patients registered yet.
									</p>
								</CardContent>
							) : (
								<ul className="divide-y divide-slate-200">
									{recentPatients.map((p) => (
										<li key={p.id} className="px-5 py-2.5">
											<p className="text-sm font-medium text-slate-900">
												{p.firstName} {p.lastName}
											</p>
											<p className="text-xs text-slate-500">
												{p.contactNumber}
												{p.bloodGroup ? ` · ${p.bloodGroup}` : ""}
											</p>
										</li>
									))}
								</ul>
							)}
						</Card>
					</div>

					<Card>
						<CardHeader
							title="Billing snapshot"
							actions={
								<Link
									to="/bills"
									className="text-sm font-medium text-primary-600 hover:text-primary-700"
								>
									View bills
								</Link>
							}
						/>
						<CardContent>
							<dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div>
									<dt className="flex items-center gap-2 text-sm text-slate-500">
										<ReceiptText className="size-4" /> Outstanding balance
									</dt>
									<dd className="mt-1 text-base font-semibold text-rose-700">
										{formatCurrency(stats.totalOutstanding)}
									</dd>
								</div>
								<div>
									<dt className="flex items-center gap-2 text-sm text-slate-500">
										<Banknote className="size-4" /> Paid this month
									</dt>
									<dd className="mt-1 text-base font-semibold text-emerald-700">
										{formatCurrency(stats.monthlyRevenue)}
									</dd>
								</div>
								<div>
									<dt className="flex items-center gap-2 text-sm text-slate-500">
										<ClipboardList className="size-4" /> Bills awaiting payment
									</dt>
									<dd className="mt-1 text-base font-semibold text-slate-900">
										{stats.pendingBills}
									</dd>
								</div>
							</dl>
						</CardContent>
					</Card>
				</>
			) : null}
		</div>
	);
}

function ScheduleAndBilling({ stats }: { stats: DashboardStats }) {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<Card className="lg:col-span-2">
				<CardHeader
					title="Today's schedule"
					subtitle="Upcoming appointments for today"
					actions={
						<Link
							to="/appointments"
							className="text-sm font-medium text-primary-600 hover:text-primary-700"
						>
							View all
						</Link>
					}
				/>
				{stats.todaySchedule.length === 0 ? (
					<div className="px-5 py-10 text-center text-sm text-slate-500">
						No appointments scheduled for today.
					</div>
				) : (
					<Table>
						<TableHead>
							<Th>Time</Th>
							<Th>Patient</Th>
							<Th>Doctor</Th>
							<Th>Status</Th>
						</TableHead>
						<TableBody>
							{stats.todaySchedule.map((item) => (
								<TableRow key={item.id}>
									<Td className="font-medium whitespace-nowrap text-slate-900">
										{formatTime(item.startTime)} – {formatTime(item.endTime)}
									</Td>
									<Td>{item.patientName}</Td>
									<Td>{item.doctorName}</Td>
									<Td>
										<Badge tone={APPOINTMENT_STATUS_TONE[item.status]}>
											{titleCase(item.status)}
										</Badge>
									</Td>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</Card>

			<Card>
				<CardHeader title="Billing snapshot" />
				<CardContent>
					<dl className="divide-y divide-slate-200">
						<div className="flex items-center justify-between py-2.5">
							<dt className="flex items-center gap-2 text-sm text-slate-500">
								<ReceiptText className="size-4" /> Outstanding balance
							</dt>
							<dd className="text-sm font-semibold text-rose-700">
								{formatCurrency(stats.totalOutstanding)}
							</dd>
						</div>
						<div className="flex items-center justify-between py-2.5">
							<dt className="flex items-center gap-2 text-sm text-slate-500">
								<Banknote className="size-4" /> Paid this month
							</dt>
							<dd className="text-sm font-semibold text-emerald-700">
								{formatCurrency(stats.monthlyRevenue)}
							</dd>
						</div>
						<div className="flex items-center justify-between py-2.5">
							<dt className="flex items-center gap-2 text-sm text-slate-500">
								<ClipboardList className="size-4" /> Bills awaiting payment
							</dt>
							<dd className="text-sm font-semibold text-slate-900">
								{stats.pendingBills}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		</div>
	);
}
