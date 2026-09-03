export interface Paginated<T> {
	data: T[];
	meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	createdAt: string;
	updatedAt: string;
	roleId: number;
	phone: string | null;
	isActive: boolean;
}

export type Gender = "FEMALE" | "MALE" | "OTHER" | "UNDISCLOSED";
export type BloodGroup =
	| "A+"
	| "A-"
	| "AB+"
	| "AB-"
	| "B+"
	| "B-"
	| "O+"
	| "O-";

export interface Patient {
	id: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: Gender;
	contactNumber: string;
	email: string | null;
	address: string | null;
	bloodGroup: BloodGroup | null;
	emergencyContactName: string | null;
	emergencyContactPhone: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

export interface Doctor {
	id: string;
	userId: string;
	name: string;
	email: string;
	specialization: string;
	department: string;
	licenseNumber: string | null;
	consultationFee: string;
	isActive: boolean;
	createdAt: string;
}

export type AppointmentStatus =
	| "SCHEDULED"
	| "CHECKED_IN"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "CANCELLED"
	| "NO_SHOW";

export interface Appointment {
	id: string;
	patientId: string;
	doctorId: string;
	createdBy: string | null;
	appointmentDate: string;
	startTime: string;
	endTime: string;
	status: AppointmentStatus;
	reason: string | null;
	checkedInAt: string | null;
	completedAt: string | null;
	cancelledAt: string | null;
	cancelledReason: string | null;
	createdAt: string;
	patientName: string;
	doctorName: string;
	createdByName: string | null;
}

export interface MedicalRecord {
	id: string;
	patientId: string;
	doctorId: string;
	appointmentId: string | null;
	diagnosis: string;
	prescription: string | null;
	treatmentPlan: string | null;
	reportFileUrl: string | null;
	createdAt: string;
	updatedAt: string;
	patientName: string;
	doctorName: string;
}

export type BillStatus =
	| "PENDING"
	| "PARTIALLY_PAID"
	| "PAID"
	| "CANCELLED"
	| "REFUNDED";

export interface Bill {
	id: string;
	patientId: string;
	appointmentId: string | null;
	totalAmount: string;
	amountPaid: string;
	status: BillStatus;
	paymentMethod: string | null;
	invoiceDate: string;
	paidAt: string | null;
	createdAt: string;
	patientName: string;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditLog {
	id: string;
	userId: string | null;
	actorName: string | null;
	actorEmail: string | null;
	action: AuditAction;
	tableName: string;
	recordId: string | null;
	oldData: Record<string, unknown> | null;
	newData: Record<string, unknown> | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
}

export interface UserSummary {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	phone: string | null;
	isActive: boolean;
	lastLoginAt: string | null;
	createdAt: string;
	role: string;
}

export interface DashboardStats {
	totalPatients: number;
	totalDoctors: number;
	todayAppointments: number;
	pendingBills: number;
	monthlyRevenue: string;
	totalOutstanding: string;
	todaySchedule: Array<{
		id: string;
		appointmentDate: string;
		startTime: string;
		endTime: string;
		status: AppointmentStatus;
		patientName: string;
		doctorName: string;
	}>;
}

export const ROLE_ID = {
	SUPER_ADMIN: 1,
	ADMIN: 2,
	DOCTOR: 3,
	RECEPTIONIST: 4,
	ACCOUNTANT: 5,
	PATIENT: 6,
} as const;
