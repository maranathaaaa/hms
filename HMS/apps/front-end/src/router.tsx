import {
	createRootRoute,
	createRoute,
	createRouter,
	Navigate,
	Outlet,
} from "@tanstack/react-router";
import { z } from "zod";

import { AppShell } from "./components/layout/AppShell.tsx";
import { AppointmentCalendarPage } from "./pages/appointment-calendar.tsx";
import { AppointmentsPage } from "./pages/appointments.tsx";
import { AuditLogsPage } from "./pages/audit-logs.tsx";
import { BillsPage } from "./pages/bills.tsx";
import { DashboardPage } from "./pages/dashboard.tsx";
import { DoctorProfilePage } from "./pages/doctor-profile.tsx";
import { DoctorsPage } from "./pages/doctors.tsx";
import { LoginPage } from "./pages/login.tsx";
import { MedicalRecordsPage } from "./pages/medical-records.tsx";
import { NotFoundPage } from "./pages/not-found.tsx";
import { PatientsPage } from "./pages/patients.tsx";
import { ReportsPage } from "./pages/reports.tsx";
import { UsersPage } from "./pages/users.tsx";

const rootRoute = createRootRoute({
	component: () => <Outlet />,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: LoginPage,
});

const appRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "app",
	component: AppShell,
});

const indexRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/",
	component: () => <Navigate to="/dashboard" replace />,
});

const dashboardRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/dashboard",
	component: DashboardPage,
});

const patientsRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/patients",
	component: PatientsPage,
	validateSearch: z.object({ search: z.string().optional() }),
});

const doctorsRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/doctors",
	component: DoctorsPage,
	validateSearch: z.object({ search: z.string().optional() }),
});

const appointmentsRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/appointments",
	component: AppointmentsPage,
});

const calendarRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/calendar",
	component: AppointmentCalendarPage,
});

const reportsRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/reports",
	component: ReportsPage,
});

const medicalRecordsRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/medical-records",
	component: MedicalRecordsPage,
});

const billsRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/bills",
	component: BillsPage,
});

const usersRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/users",
	component: UsersPage,
});

const auditLogsRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/audit-logs",
	component: AuditLogsPage,
});

const doctorProfileRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "/doctor-profile",
	component: DoctorProfilePage,
});

const notFoundRoute = createRoute({
	getParentRoute: () => appRoute,
	path: "*",
	component: NotFoundPage,
});

const routeTree = rootRoute.addChildren([
	loginRoute,
	appRoute.addChildren([
		indexRoute,
		dashboardRoute,
		patientsRoute,
		doctorsRoute,
		appointmentsRoute,
		calendarRoute,
		medicalRecordsRoute,
		billsRoute,
		reportsRoute,
		usersRoute,
		auditLogsRoute,
		doctorProfileRoute,
		notFoundRoute,
	]),
]);

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
