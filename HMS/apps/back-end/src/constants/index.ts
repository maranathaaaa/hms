export const ROLES = {
	SUPER_ADMIN: "SUPER_ADMIN",
	ADMIN: "ADMIN",
	DOCTOR: "DOCTOR",
	RECEPTIONIST: "RECEPTIONIST",
	ACCOUNTANT: "ACCOUNTANT",
	PATIENT: "PATIENT",
} as const;

export const ROLE_VALUES = Object.values(ROLES);

export type RoleName = (typeof ROLE_VALUES)[number];

export const DEFAULT_ROLE: RoleName = ROLES.PATIENT;

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
	SUPER_ADMIN: "Unrestricted access, including role and user management.",
	ADMIN: "Hospital administration: staff, patients, scheduling and billing.",
	DOCTOR: "Clinical access to their own appointments and medical records.",
	RECEPTIONIST: "Front desk: patient registration and appointment scheduling.",
	ACCOUNTANT: "Billing and payment management.",
	PATIENT: "Self-service portal access.",
};

export const PERMISSIONS = {
	USER_READ: "user:read",
	USER_WRITE: "user:write",
	USER_DELETE: "user:delete",
	ROLE_MANAGE: "role:manage",

	DOCTOR_READ: "doctor:read",
	DOCTOR_WRITE: "doctor:write",
	DOCTOR_DELETE: "doctor:delete",

	PATIENT_READ: "patient:read",
	PATIENT_WRITE: "patient:write",
	PATIENT_DELETE: "patient:delete",

	APPOINTMENT_READ: "appointment:read",
	APPOINTMENT_WRITE: "appointment:write",
	APPOINTMENT_CANCEL: "appointment:cancel",

	MEDICAL_RECORD_READ: "medical_record:read",
	MEDICAL_RECORD_WRITE: "medical_record:write",

	BILL_READ: "bill:read",
	BILL_WRITE: "bill:write",

	AUDIT_READ: "audit:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
	SUPER_ADMIN: ALL_PERMISSIONS,

	ADMIN: [
		PERMISSIONS.USER_READ,
		PERMISSIONS.USER_WRITE,
		PERMISSIONS.USER_DELETE,
		PERMISSIONS.DOCTOR_READ,
		PERMISSIONS.DOCTOR_WRITE,
		PERMISSIONS.DOCTOR_DELETE,
		PERMISSIONS.PATIENT_READ,
		PERMISSIONS.PATIENT_WRITE,
		PERMISSIONS.PATIENT_DELETE,
		PERMISSIONS.APPOINTMENT_READ,
		PERMISSIONS.APPOINTMENT_WRITE,
		PERMISSIONS.APPOINTMENT_CANCEL,
		PERMISSIONS.MEDICAL_RECORD_READ,
		PERMISSIONS.BILL_READ,
		PERMISSIONS.BILL_WRITE,
		PERMISSIONS.AUDIT_READ,
	],

	DOCTOR: [
		PERMISSIONS.DOCTOR_READ,
		PERMISSIONS.PATIENT_READ,
		PERMISSIONS.APPOINTMENT_READ,
		PERMISSIONS.APPOINTMENT_WRITE,
		PERMISSIONS.APPOINTMENT_CANCEL,
		PERMISSIONS.MEDICAL_RECORD_READ,
		PERMISSIONS.MEDICAL_RECORD_WRITE,
	],

	RECEPTIONIST: [
		PERMISSIONS.DOCTOR_READ,
		PERMISSIONS.PATIENT_READ,
		PERMISSIONS.PATIENT_WRITE,
		PERMISSIONS.APPOINTMENT_READ,
		PERMISSIONS.APPOINTMENT_WRITE,
		PERMISSIONS.APPOINTMENT_CANCEL,
		PERMISSIONS.BILL_READ,
	],

	ACCOUNTANT: [
		PERMISSIONS.PATIENT_READ,
		PERMISSIONS.APPOINTMENT_READ,
		PERMISSIONS.BILL_READ,
		PERMISSIONS.BILL_WRITE,
	],

	PATIENT: [PERMISSIONS.DOCTOR_READ, PERMISSIONS.APPOINTMENT_READ],
};

export const APPOINTMENT_STATUS = {
	SCHEDULED: "SCHEDULED",
	CHECKED_IN: "CHECKED_IN",
	IN_PROGRESS: "IN_PROGRESS",
	COMPLETED: "COMPLETED",
	CANCELLED: "CANCELLED",
	NO_SHOW: "NO_SHOW",
} as const;

export const APPOINTMENT_STATUS_VALUES = Object.values(APPOINTMENT_STATUS);
export type AppointmentStatus = (typeof APPOINTMENT_STATUS_VALUES)[number];

export const BILL_STATUS = {
	PENDING: "PENDING",
	PARTIALLY_PAID: "PARTIALLY_PAID",
	PAID: "PAID",
	CANCELLED: "CANCELLED",
	REFUNDED: "REFUNDED",
} as const;

export const BILL_STATUS_VALUES = Object.values(BILL_STATUS);
export type BillStatus = (typeof BILL_STATUS_VALUES)[number];

export const PAYMENT_METHODS = [
	"CASH",
	"CARD",
	"BANK_TRANSFER",
	"MOBILE_MONEY",
	"INSURANCE",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_GROUPS = [
	"A+",
	"A-",
	"B+",
	"B-",
	"AB+",
	"AB-",
	"O+",
	"O-",
] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const AUDIT_ACTIONS = [
	"CREATE",
	"UPDATE",
	"DELETE",
	"RESTORE",
	"LOGIN",
	"LOGOUT",
	"LOGIN_FAILED",
	"PASSWORD_CHANGE",
	"ROLE_CHANGE",
	"EXPORT",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const VERIFICATION_TYPES = [
	"GENERIC",
	"EMAIL_VERIFICATION",
	"PASSWORD_RESET",
	"EMAIL_CHANGE",
	"TWO_FACTOR",
] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const AUTH_PROVIDERS = ["credential", "google", "github"] as const;

export const PAGINATION = {
	DEFAULT_PAGE: 1,
	DEFAULT_LIMIT: 20,
	MAX_LIMIT: 100,
} as const;

export const SESSION = {
	EXPIRES_IN: 60 * 60 * 24 * 7,
	UPDATE_AGE: 60 * 60 * 24,
	COOKIE_CACHE_MAX_AGE: 60 * 5,
} as const;

export const PASSWORD = {
	MIN_LENGTH: 12,
	MAX_LENGTH: 128,
} as const;
