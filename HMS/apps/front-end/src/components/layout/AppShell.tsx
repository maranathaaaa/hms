import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
	Activity,
	BarChart3,
	CalendarDays,
	CalendarRange,
	FileText,
	HeartPulse,
	LogOut,
	Menu,
	Receipt,
	ScrollText,
	Stethoscope,
	UserCog,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "../../lib/auth-client.ts";
import { ROLE_ID, type SessionUser } from "../../lib/types.ts";
import { initials } from "../../lib/utils.ts";
import { GlobalSearch } from "./global-search.tsx";

interface NavItem {
	to: string;
	label: string;
	icon: LucideIcon;
}

interface PageNavItem {
	page: string;
	label: string;
	icon: LucideIcon;
}

const ALL_NAV: PageNavItem[] = [
	{ page: "dashboard", label: "Dashboard", icon: Activity },
	{ page: "patients", label: "Patients", icon: Users },
	{ page: "doctors", label: "Doctors", icon: Stethoscope },
	{ page: "appointments", label: "Appointments", icon: CalendarDays },
	{ page: "calendar", label: "Calendar", icon: CalendarRange },
	{ page: "medical-records", label: "Medical Records", icon: FileText },
	{ page: "bills", label: "Bills", icon: Receipt },
	{ page: "reports", label: "Reports", icon: BarChart3 },
	{ page: "users", label: "Users", icon: UserCog },
	{ page: "audit-logs", label: "Audit Logs", icon: ScrollText },
];

const DOCTOR_NAV: PageNavItem[] = [
	{ page: "dashboard", label: "Dashboard", icon: Activity },
	{ page: "appointments", label: "Appointments", icon: CalendarDays },
	{ page: "calendar", label: "Calendar", icon: CalendarRange },
	{ page: "medical-records", label: "Medical Records", icon: FileText },
	{ page: "doctor-profile", label: "My Profile", icon: Stethoscope },
];

const RECEPTIONIST_NAV: PageNavItem[] = [
	{ page: "dashboard", label: "Dashboard", icon: Activity },
	{ page: "patients", label: "Patients", icon: Users },
	{ page: "doctors", label: "Doctors", icon: Stethoscope },
	{ page: "appointments", label: "Appointments", icon: CalendarDays },
	{ page: "calendar", label: "Calendar", icon: CalendarRange },
	{ page: "bills", label: "Bills", icon: Receipt },
];

const ACCOUNTANT_NAV: PageNavItem[] = [
	...RECEPTIONIST_NAV,
	{ page: "reports", label: "Reports", icon: BarChart3 },
];

function actorSlug(roleId: number): string {
	switch (roleId) {
		case ROLE_ID.SUPER_ADMIN:
			return "super-admin";
		case ROLE_ID.ADMIN:
			return "admin";
		case ROLE_ID.DOCTOR:
			return "doctor";
		case ROLE_ID.RECEPTIONIST:
			return "receptionist";
		case ROLE_ID.ACCOUNTANT:
			return "accountant";
		case ROLE_ID.PATIENT:
			return "patient";
		default:
			return "";
	}
}

function navFor(user: SessionUser): NavItem[] {
	const prefix = `/${actorSlug(user.roleId)}`;
	let items: PageNavItem[];
	switch (user.roleId) {
		case ROLE_ID.SUPER_ADMIN:
		case ROLE_ID.ADMIN:
			items = ALL_NAV;
			break;
		case ROLE_ID.DOCTOR:
			items = DOCTOR_NAV;
			break;
		case ROLE_ID.RECEPTIONIST:
			items = RECEPTIONIST_NAV;
			break;
		case ROLE_ID.ACCOUNTANT:
			items = ACCOUNTANT_NAV;
			break;
		default:
			return [];
	}
	return items.map((item) => ({ ...item, to: `${prefix}/${item.page}` }));
}

function roleLabel(user: SessionUser): string {
	switch (user.roleId) {
		case ROLE_ID.SUPER_ADMIN:
			return "Super Admin";
		case ROLE_ID.ADMIN:
			return "Administrator";
		case ROLE_ID.DOCTOR:
			return "Doctor";
		case ROLE_ID.RECEPTIONIST:
			return "Receptionist";
		case ROLE_ID.ACCOUNTANT:
			return "Accountant";
		default:
			return "Patient";
	}
}

export function AppShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const { data, isPending } = authClient.useSession();
	const [menuOpen, setMenuOpen] = useState(false);

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex items-center gap-3 text-sm text-slate-500">
					<span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary-600" />
					Loading…
				</div>
			</div>
		);
	}

	const user = data?.user as SessionUser | undefined;

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	const nav = navFor(user);

	const handleSignOut = async () => {
		await authClient.signOut();
		toast.success("Signed out");
		navigate({ to: "/login", replace: true });
	};

	const sidebar = (
		<aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
			<div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
				<HeartPulse className="size-5 shrink-0 text-primary-600" />
				<div>
					<p className="text-sm leading-tight font-semibold text-slate-900">
						NexaCare
					</p>
					<p className="text-xs leading-tight text-slate-500">
						Hospital Management
					</p>
				</div>
			</div>

			<nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
				{nav.map((item) => (
					<Link
						key={item.to}
						to={item.to as never}
						activeOptions={{ exact: true }}
						activeProps={{
							className: "bg-primary-50 text-primary-700 font-semibold",
						}}
						className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
						onClick={() => setMenuOpen(false)}
					>
						<item.icon className="size-4 shrink-0" />
						{item.label}
					</Link>
				))}
			</nav>

			<div className="border-t border-slate-200 px-3 py-3">
				<div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
					<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600">
						{initials(user.name)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-slate-900">
							{user.name}
						</p>
						<p className="truncate text-xs text-slate-500">{roleLabel(user)}</p>
					</div>
					<button
						onClick={handleSignOut}
						className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
						title="Sign out"
						aria-label="Sign out"
					>
						<LogOut className="size-4" />
					</button>
				</div>
			</div>
		</aside>
	);

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
				{sidebar}
			</div>

			{menuOpen ? (
				<div className="fixed inset-0 z-40 lg:hidden">
					<div
						className="absolute inset-0 bg-slate-900/40"
						onClick={() => setMenuOpen(false)}
						aria-hidden
					/>
					<div className="absolute inset-y-0 left-0">
						<div className="relative h-full">
							<button
								type="button"
								onClick={() => setMenuOpen(false)}
								aria-label="Close menu"
								className="absolute top-4 -right-12 rounded-lg border border-white/20 p-2 text-white"
							>
								✕
							</button>
							{sidebar}
						</div>
					</div>
				</div>
			) : null}

			<header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4 lg:left-60">
				<button
					type="button"
					onClick={() => setMenuOpen(true)}
					className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
					aria-label="Open menu"
				>
					<Menu className="size-4" />
				</button>
				<Link to={(nav[0]?.to ?? "/login") as never} className="flex items-center gap-2 lg:hidden">
					<HeartPulse className="size-4 text-primary-600" />
					<span className="text-sm font-semibold text-slate-900">NexaCare</span>
				</Link>
				<div className="mx-auto w-full max-w-md flex-1">
					<GlobalSearch />
				</div>
			</header>

			<main className="mt-14 lg:ml-60">
				<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
					{children}
				</div>
			</main>
		</div>
	);
}
