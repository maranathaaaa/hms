import { defineRelations } from "drizzle-orm";

import { accounts } from "./accounts.ts";
import { appointments } from "./appointments.ts";
import { auditLogs } from "./audit-logs.ts";
import { bills } from "./bills.ts";
import { doctors } from "./doctors.ts";
import { medicalRecords } from "./medical-records.ts";
import { patients } from "./patients.ts";
import { roles } from "./roles.ts";
import { sessions } from "./sessions.ts";
import { users } from "./users.ts";
import { verifications } from "./verifications.ts";

const tables = {
	roles,
	users,
	accounts,
	sessions,
	verifications,
	doctors,
	patients,
	appointments,
	medicalRecords,
	bills,
	auditLogs,
};

/**
 * Relational-query graph for `db.query.*`.
 *
 * Drizzle v1 uses `defineRelations` (the old per-table `relations()` helper is
 * gone). Relations live in their own file because the FK columns in the table
 * files already encode the constraints — this only teaches the query builder
 * how to join.
 */
export const relations = defineRelations(tables, (r) => ({
	roles: {
		users: r.many.users(),
	},

	users: {
		role: r.one.roles({
			from: r.users.roleId,
			to: r.roles.id,
			optional: false,
		}),
		accounts: r.many.accounts(),
		sessions: r.many.sessions(),
		doctor: r.one.doctors({
			from: r.users.id,
			to: r.doctors.userId,
		}),
		createdAppointments: r.many.appointments(),
		auditLogs: r.many.auditLogs(),
	},

	accounts: {
		user: r.one.users({
			from: r.accounts.userId,
			to: r.users.id,
			optional: false,
		}),
	},

	sessions: {
		user: r.one.users({
			from: r.sessions.userId,
			to: r.users.id,
			optional: false,
		}),
	},

	doctors: {
		user: r.one.users({
			from: r.doctors.userId,
			to: r.users.id,
			optional: false,
		}),
		appointments: r.many.appointments(),
		medicalRecords: r.many.medicalRecords(),
	},

	patients: {
		appointments: r.many.appointments(),
		medicalRecords: r.many.medicalRecords(),
		bills: r.many.bills(),
	},

	appointments: {
		patient: r.one.patients({
			from: r.appointments.patientId,
			to: r.patients.id,
			optional: false,
		}),
		doctor: r.one.doctors({
			from: r.appointments.doctorId,
			to: r.doctors.id,
			optional: false,
		}),
		creator: r.one.users({
			from: r.appointments.createdBy,
			to: r.users.id,
		}),
		medicalRecord: r.one.medicalRecords({
			from: r.appointments.id,
			to: r.medicalRecords.appointmentId,
		}),
		bill: r.one.bills({
			from: r.appointments.id,
			to: r.bills.appointmentId,
		}),
	},

	medicalRecords: {
		patient: r.one.patients({
			from: r.medicalRecords.patientId,
			to: r.patients.id,
			optional: false,
		}),
		doctor: r.one.doctors({
			from: r.medicalRecords.doctorId,
			to: r.doctors.id,
			optional: false,
		}),
		appointment: r.one.appointments({
			from: r.medicalRecords.appointmentId,
			to: r.appointments.id,
		}),
	},

	bills: {
		patient: r.one.patients({
			from: r.bills.patientId,
			to: r.patients.id,
			optional: false,
		}),
		appointment: r.one.appointments({
			from: r.bills.appointmentId,
			to: r.appointments.id,
		}),
	},

	auditLogs: {
		user: r.one.users({
			from: r.auditLogs.userId,
			to: r.users.id,
			optional: false,
		}),
	},

	verifications: {},
}));
