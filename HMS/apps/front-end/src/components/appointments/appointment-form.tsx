import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../../lib/api.ts";
import type {
	Appointment,
	Doctor,
	Paginated,
	Patient,
} from "../../lib/types.ts";
import { Button } from "../ui/button.tsx";
import { Field, Input, Select } from "../ui/field.tsx";
import { Modal } from "../ui/modal.tsx";

const appointmentSchema = z
	.object({
		patientId: z.string().uuid("Select a patient").optional(),
		doctorId: z.string().uuid("Select a doctor"),
		appointmentDate: z.string().min(1, "Pick a date"),
		startTime: z.string().min(1, "Start time is required"),
		endTime: z.string().min(1, "End time is required"),
		reason: z.string().trim().max(2000).optional(),
	})
	.refine((v) => !v.startTime || !v.endTime || v.startTime < v.endTime, {
		message: "Start time must be before end time",
		path: ["endTime"],
	});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export interface AppointmentPrefill {
	doctorId?: string;
	appointmentDate?: string;
	startTime?: string;
	endTime?: string;
}

function useDoctorOptions(enabled: boolean) {
	return useQuery({
		queryKey: ["doctors", "options"],
		queryFn: () =>
			api.get<Paginated<Doctor>>("/api/doctors", { page: 1, limit: 100 }),
		enabled,
	});
}

function AppointmentFields({
	register,
	errors,
	doctors,
	patients,
	showPatient,
	hideDoctor,
}: {
	register: ReturnType<typeof useForm<AppointmentFormValues>>["register"];
	errors: Record<string, { message?: string } | undefined>;
	doctors: Doctor[];
	patients?: Patient[];
	showPatient?: boolean;
	hideDoctor: boolean;
}) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{showPatient ? (
				<Field label="Patient" error={errors.patientId?.message}>
					<Select {...register("patientId")}>
						<option value="">Select patient…</option>
						{(patients ?? []).map((p) => (
							<option key={p.id} value={p.id}>
								{p.firstName} {p.lastName}
							</option>
						))}
					</Select>
				</Field>
			) : null}
			{!hideDoctor ? (
				<Field label="Doctor" error={errors.doctorId?.message}>
					<Select {...register("doctorId")}>
						<option value="">Select doctor…</option>
						{doctors.map((d) => (
							<option key={d.id} value={d.id}>
								{d.name} — {d.specialization}
							</option>
						))}
					</Select>
				</Field>
			) : null}
			<Field
				label="Date"
				error={errors.appointmentDate?.message}
				className={hideDoctor ? "sm:col-span-2" : undefined}
			>
				<Input type="date" {...register("appointmentDate")} />
			</Field>
			<div className="grid grid-cols-2 gap-3 sm:col-span-2">
				<Field label="Start" error={errors.startTime?.message}>
					<Input type="time" {...register("startTime")} />
				</Field>
				<Field label="End" error={errors.endTime?.message}>
					<Input type="time" {...register("endTime")} />
				</Field>
			</div>
			<Field
				label="Reason"
				error={errors.reason?.message}
				className="sm:col-span-2"
			>
				<Input placeholder="e.g. Routine checkup" {...register("reason")} />
			</Field>
		</div>
	);
}

export function AppointmentFormModal({
	open,
	onClose,
	onCreated,
	patientId,
	prefill,
	hideDoctor,
}: {
	open: boolean;
	onClose: () => void;
	onCreated: () => void;
	patientId?: string;
	prefill?: AppointmentPrefill;
	hideDoctor?: boolean;
}) {
	const queryClient = useQueryClient();
	const { data: patientsData } = useQuery({
		queryKey: ["patients", "options"],
		queryFn: () =>
			api.get<Paginated<Patient>>("/api/patients", { page: 1, limit: 100 }),
		enabled: open,
	});
	const { data: doctorsData } = useDoctorOptions(open);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<AppointmentFormValues>({
		resolver: zodResolver(appointmentSchema),
	});

	useEffect(() => {
		if (open) {
			reset({
				patientId: patientId ?? "",
				doctorId: prefill?.doctorId ?? "",
				appointmentDate: prefill?.appointmentDate ?? "",
				startTime: prefill?.startTime ?? "",
				endTime: prefill?.endTime ?? "",
				reason: "",
			});
		}
	}, [open, prefill, patientId, reset]);

	const createMutation = useMutation({
		mutationFn: (values: AppointmentFormValues) =>
			api.post<{ data: Appointment }>("/api/appointments", {
				...values,
				patientId: patientId ?? values.patientId,
				reason: values.reason || undefined,
			}),
		onSuccess: () => {
			toast.success("Appointment scheduled");
			reset();
			onCreated();
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to schedule"),
	});

	return (
		<Modal
			open={open}
			onClose={onClose}
			title="Schedule appointment"
			subtitle="Book a patient visit with a doctor"
			size="lg"
		>
			<form
				onSubmit={handleSubmit((v) => createMutation.mutate(v))}
				className="grid grid-cols-1 gap-4"
			>
				{patientId ? (
					<div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
						<p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
							Patient
						</p>
						<p className="mt-0.5 text-sm font-medium text-slate-900">
							{(patientsData?.data ?? []).find((p) => p.id === patientId)
								? `${(patientsData?.data ?? []).find((p) => p.id === patientId)!.firstName} ${(patientsData?.data ?? []).find((p) => p.id === patientId)!.lastName}`
								: "Loading…"}
						</p>
					</div>
				) : null}

				<AppointmentFields
					register={register}
					errors={errors}
					doctors={doctorsData?.data ?? []}
					patients={patientsData?.data}
					showPatient={!patientId}
					hideDoctor={hideDoctor ?? false}
				/>

				<div className="flex items-center justify-end gap-2 pt-2">
					<Button type="button" variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" loading={createMutation.isPending}>
						<CalendarDays className="size-4" /> Schedule
					</Button>
				</div>
			</form>
		</Modal>
	);
}

export function RescheduleAppointmentModal({
	appt,
	onClose,
	onRescheduled,
}: {
	appt: Appointment | null;
	onClose: () => void;
	onRescheduled: () => void;
}) {
	const queryClient = useQueryClient();
	const { data: doctorsData } = useDoctorOptions(appt !== null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<AppointmentFormValues>({
		resolver: zodResolver(appointmentSchema),
	});

	useEffect(() => {
		if (appt) {
			reset({
				doctorId: appt.doctorId,
				appointmentDate: appt.appointmentDate,
				startTime: appt.startTime.slice(0, 5),
				endTime: appt.endTime.slice(0, 5),
				reason: appt.reason ?? "",
			});
		}
	}, [appt, reset]);

	const updateMutation = useMutation({
		mutationFn: (values: AppointmentFormValues) =>
			api.patch<{ data: Appointment }>(`/api/appointments/${appt!.id}`, {
				...values,
				reason: values.reason || undefined,
			}),
		onSuccess: () => {
			toast.success("Appointment rescheduled");
			onRescheduled();
			queryClient.invalidateQueries({ queryKey: ["appointments"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Reschedule failed"),
	});

	const close = () => {
		reset();
		onClose();
	};

	return (
		<Modal
			open={appt !== null}
			onClose={close}
			title="Reschedule appointment"
			subtitle={
				appt
					? `${appt.patientName} · ${appt.appointmentDate} ${appt.startTime.slice(0, 5)}`
					: undefined
			}
			size="lg"
		>
			<form
				onSubmit={handleSubmit((v) => updateMutation.mutate(v))}
				className="grid grid-cols-1 gap-4"
			>
				<AppointmentFields
					register={register}
					errors={errors}
					doctors={doctorsData?.data ?? []}
					hideDoctor={false}
				/>
				<div className="flex items-center justify-end gap-2 pt-2">
					<Button type="button" variant="secondary" onClick={close}>
						Cancel
					</Button>
					<Button type="submit" loading={updateMutation.isPending}>
						<CalendarDays className="size-4" /> Reschedule
					</Button>
				</div>
			</form>
		</Modal>
	);
}
