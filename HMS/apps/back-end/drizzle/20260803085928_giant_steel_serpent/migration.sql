CREATE TABLE "roles" (
	"id" serial PRIMARY KEY,
	"name" varchar(50) NOT NULL UNIQUE,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"role_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" varchar(500),
	"phone" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"password" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"token_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'GENERIC' NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"specialization" varchar(150) NOT NULL,
	"department" varchar(100) NOT NULL,
	"license_number" varchar(100),
	"consultation_fee" numeric(10,2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "doctors_consultation_fee_non_negative" CHECK ("consultation_fee" >= 0)
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" varchar(20) NOT NULL,
	"contact_number" varchar(20) NOT NULL,
	"email" varchar(255),
	"address" text,
	"blood_group" varchar(5),
	"emergency_contact_name" varchar(100),
	"emergency_contact_phone" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"created_by" uuid,
	"appointment_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"status" varchar(30) DEFAULT 'SCHEDULED' NOT NULL,
	"reason" text,
	"checked_in_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "appointments_time_order" CHECK ("start_time" < "end_time"),
	CONSTRAINT "appointments_cancelled_has_reason" CHECK (("status" <> 'CANCELLED') OR ("cancelled_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"appointment_id" uuid,
	"diagnosis" text NOT NULL,
	"prescription" text,
	"treatment_plan" text,
	"report_file_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"total_amount" numeric(10,2) NOT NULL,
	"amount_paid" numeric(10,2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"payment_method" varchar(50),
	"invoice_date" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "bills_total_amount_non_negative" CHECK ("total_amount" >= 0),
	CONSTRAINT "bills_amount_paid_non_negative" CHECK ("amount_paid" >= 0),
	CONSTRAINT "bills_amount_paid_not_over_total" CHECK ("amount_paid" <= "total_amount")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" ("role_id");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
CREATE INDEX "verifications_expires_at_idx" ON "verifications" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_user_id_unique" ON "doctors" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_license_number_unique" ON "doctors" ("license_number");--> statement-breakpoint
CREATE INDEX "doctors_department_idx" ON "doctors" ("department");--> statement-breakpoint
CREATE INDEX "doctors_specialization_idx" ON "doctors" ("specialization");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_email_unique" ON "patients" ("email");--> statement-breakpoint
CREATE INDEX "patients_last_name_idx" ON "patients" ("last_name");--> statement-breakpoint
CREATE INDEX "patients_contact_number_idx" ON "patients" ("contact_number");--> statement-breakpoint
CREATE INDEX "patients_deleted_at_idx" ON "patients" ("deleted_at");--> statement-breakpoint
CREATE INDEX "appointments_doctor_date_idx" ON "appointments" ("doctor_id","appointment_date");--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" ("status");--> statement-breakpoint
CREATE INDEX "appointments_date_idx" ON "appointments" ("appointment_date");--> statement-breakpoint
CREATE UNIQUE INDEX "medical_records_appointment_unique" ON "medical_records" ("appointment_id");--> statement-breakpoint
CREATE INDEX "medical_records_patient_idx" ON "medical_records" ("patient_id");--> statement-breakpoint
CREATE INDEX "medical_records_doctor_idx" ON "medical_records" ("doctor_id");--> statement-breakpoint
CREATE INDEX "medical_records_created_at_idx" ON "medical_records" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bills_appointment_unique" ON "bills" ("appointment_id");--> statement-breakpoint
CREATE INDEX "bills_patient_idx" ON "bills" ("patient_id");--> statement-breakpoint
CREATE INDEX "bills_status_idx" ON "bills" ("status");--> statement-breakpoint
CREATE INDEX "bills_invoice_date_idx" ON "bills" ("invoice_date");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_record_idx" ON "audit_logs" ("table_name","record_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_doctor_id_doctors_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;