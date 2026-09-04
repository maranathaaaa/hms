import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, Paperclip, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { Field, Select, Textarea } from "../components/ui/field.tsx";
import { Modal } from "../components/ui/modal.tsx";
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
	Th,
} from "../components/ui/table.tsx";
import { api } from "../lib/api.ts";
import type {
	Appointment,
	Doctor,
	MedicalRecord,
	Paginated,
	Patient,
} from "../lib/types.ts";
import { formatDateTime } from "../lib/utils.ts";
import { absoluteApiUrl } from "../config/env.ts";

const LIMIT = 10;

const recordSchema = z.object({
	patientId: z.string().uuid("Select a patient"),
	doctorId: z.string().uuid("Select a doctor").optional(),
	appointmentId: z.string().uuid().optional(),
	diagnosis: z.string().trim().min(1, "Diagnosis is required").max(5000),
	prescription: z.string().trim().max(5000).optional(),
	treatmentPlan: z.string().trim().max(5000).optional(),
});

type RecordFormValues = z.infer<typeof recordSchema>;

const editSchema = z.object({
	diagnosis: z.string().trim().min(1, "Diagnosis is required").max(5000),
	prescription: z.string().trim().max(5000).optional(),
	treatmentPlan: z.string().trim().max(5000).optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

export function MedicalRecordsPage() {
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [createOpen, setCreateOpen] = useState(false);
	const [viewing, setViewing] = useState<MedicalRecord | null>(null);
	const [uploadTarget, setUploadTarget] = useState<MedicalRecord | null>(null);
	const [editing, setEditing] = useState<MedicalRecord | null>(null);

	const { data, isLoading, error } = useQuery({
		queryKey: ["medical-records", page],
		queryFn: () =>
			api.get<Paginated<MedicalRecord>>("/api/medical-records", {
				page,
				limit: LIMIT,
			}),
	});

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["medical-records"] });

	const records = data?.data ?? [];
	const meta = data?.meta;

	const { sorted, key, dir, toggle } = useSort(records, "updatedAt");

	return (
		<div className="space-y-5">
			<PageHeader
				title="Medical Records"
				subtitle="Clinical notes, diagnoses and treatment plans"
				actions={
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="size-4" /> New record
					</Button>
				}
			/>

			<Card>
				{isLoading ? <Spinner /> : null}
				{error ? (
					<InlineError
						message={
							error instanceof Error ? error.message : "Failed to load records"
						}
					/>
				) : null}

				{!isLoading && !error && records.length === 0 ? (
					<EmptyState
						title="No medical records yet"
						description="Records are written by doctors after a patient visit."
						action={
							<Button onClick={() => setCreateOpen(true)}>
								<Plus className="size-4" /> New record
							</Button>
						}
					/>
				) : null}

				{!isLoading && !error && records.length > 0 ? (
					<>
						<Table>
							<TableHead>
								<SortableTh
									field="patientName"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Patient
								</SortableTh>
								<SortableTh
									field="doctorName"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Doctor
								</SortableTh>
								<SortableTh
									field="diagnosis"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Diagnosis
								</SortableTh>
								<SortableTh
									field="prescription"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Prescription
								</SortableTh>
								<SortableTh
									field="reportFileUrl"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Report
								</SortableTh>
								<SortableTh
									field="updatedAt"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Updated
								</SortableTh>
								<Th className="text-right">Actions</Th>
							</TableHead>
							<TableBody>
								{sorted.map((record) => (
									<TableRow key={record.id}>
										<Td className="font-medium text-slate-900">
											{record.patientName}
										</Td>
										<Td className="text-slate-600">{record.doctorName}</Td>
										<Td
											className="max-w-52 truncate text-slate-600"
											title={record.diagnosis}
										>
											{record.diagnosis}
										</Td>
										<Td
											className="max-w-40 truncate text-slate-500"
											title={record.prescription ?? ""}
										>
											{record.prescription ?? "—"}
										</Td>
										<Td>
											{record.reportFileUrl ? (
												<Badge tone="neutral">Attached</Badge>
											) : (
												<span className="text-xs text-slate-400">None</span>
											)}
										</Td>
										<Td className="whitespace-nowrap text-slate-500">
											{formatDateTime(record.updatedAt)}
										</Td>
										<Td className="text-right">
											<div className="inline-flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setViewing(record)}
													aria-label="View record"
												>
													<Eye className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setEditing(record)}
													aria-label="Edit record"
												>
													<Pencil className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setUploadTarget(record)}
													aria-label="Attach report"
												>
													<Paperclip className="size-4" />
												</Button>
											</div>
										</Td>
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

			<CreateRecordModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreated={() => {
					setCreateOpen(false);
					invalidate();
				}}
			/>

			<ViewRecordModal record={viewing} onClose={() => setViewing(null)} />

			<EditRecordModal
				record={editing}
				onClose={() => setEditing(null)}
				onUpdated={() => {
					setEditing(null);
					invalidate();
				}}
			/>

			<UploadReportModal
				record={uploadTarget}
				onClose={() => setUploadTarget(null)}
				onUploaded={() => {
					setUploadTarget(null);
					invalidate();
				}}
			/>
		</div>
	);
}

function CreateRecordModal({
	open,
	onClose,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	onCreated: () => void;
}) {
	const { data: patientsData } = useQuery({
		queryKey: ["patients", "options"],
		queryFn: () =>
			api.get<Paginated<Patient>>("/api/patients", { page: 1, limit: 100 }),
		enabled: open,
	});
	const { data: doctorsData } = useQuery({
		queryKey: ["doctors", "options"],
		queryFn: () =>
			api.get<Paginated<Doctor>>("/api/doctors", { page: 1, limit: 100 }),
		enabled: open,
	});
	const { data: appointmentsData } = useQuery({
		queryKey: ["appointments", "options"],
		queryFn: () =>
			api.get<Paginated<Appointment>>("/api/appointments", {
				page: 1,
				limit: 100,
			}),
		enabled: open,
	});

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<RecordFormValues>({ resolver: zodResolver(recordSchema) });

	const createMutation = useMutation({
		mutationFn: (values: RecordFormValues) =>
			api.post<{ data: MedicalRecord }>("/api/medical-records", {
				...values,
				doctorId: values.doctorId || undefined,
				appointmentId: values.appointmentId || undefined,
				prescription: values.prescription || undefined,
				treatmentPlan: values.treatmentPlan || undefined,
			}),
		onSuccess: () => {
			toast.success("Medical record created");
			reset();
			onCreated();
		},
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to create record",
			),
	});

	return (
		<Modal
			open={open}
			onClose={onClose}
			title="New medical record"
			subtitle="Clinical notes for a patient visit"
			size="lg"
		>
			<form
				onSubmit={handleSubmit((v) => createMutation.mutate(v))}
				className="grid grid-cols-1 gap-4 sm:grid-cols-2"
			>
				<Field label="Patient" error={errors.patientId?.message}>
					<Select {...register("patientId")}>
						<option value="">Select patient…</option>
						{(patientsData?.data ?? []).map((p) => (
							<option key={p.id} value={p.id}>
								{p.firstName} {p.lastName}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Doctor" error={errors.doctorId?.message}>
					<Select {...register("doctorId")}>
						<option value="">Select doctor…</option>
						{(doctorsData?.data ?? []).map((d) => (
							<option key={d.id} value={d.id}>
								{d.name}
							</option>
						))}
					</Select>
				</Field>
				<Field
					label="Appointment"
					error={errors.appointmentId?.message}
					className="sm:col-span-2"
				>
					<Select {...register("appointmentId")}>
						<option value="">None — walk-in visit</option>
						{(appointmentsData?.data ?? []).map((a) => (
							<option key={a.id} value={a.id}>
								{a.patientName} · {a.appointmentDate}
							</option>
						))}
					</Select>
				</Field>
				<Field
					label="Diagnosis"
					error={errors.diagnosis?.message}
					className="sm:col-span-2"
				>
					<Textarea
						placeholder="Primary diagnosis and clinical findings…"
						{...register("diagnosis")}
					/>
				</Field>
				<Field
					label="Prescription"
					error={errors.prescription?.message}
					className="sm:col-span-2"
				>
					<Textarea
						placeholder="Medications and dosages…"
						{...register("prescription")}
					/>
				</Field>
				<Field
					label="Treatment plan"
					error={errors.treatmentPlan?.message}
					className="sm:col-span-2"
				>
					<Textarea
						placeholder="Follow-up and care instructions…"
						{...register("treatmentPlan")}
					/>
				</Field>
				<div className="flex items-center justify-end gap-2 pt-2 sm:col-span-2">
					<Button type="button" variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" loading={createMutation.isPending}>
						<FileText className="size-4" /> Save record
					</Button>
				</div>
			</form>
		</Modal>
	);
}

function ViewRecordModal({
	record,
	onClose,
}: {
	record: MedicalRecord | null;
	onClose: () => void;
}) {
	return (
		<Modal
			open={record !== null}
			onClose={onClose}
			title="Medical record"
			subtitle={
				record ? `${record.patientName} · ${record.doctorName}` : undefined
			}
			size="lg"
		>
			{record ? (
				<div className="space-y-4">
					<Section label="Diagnosis" value={record.diagnosis} />
					<Section label="Prescription" value={record.prescription} />
					<Section label="Treatment plan" value={record.treatmentPlan} />
					<div className="border-t border-slate-200 pt-3">
						{record.reportFileUrl ? (
							<a
								href={absoluteApiUrl(record.reportFileUrl)}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								<Paperclip className="size-4" /> View attached report
							</a>
						) : (
							<p className="text-sm text-slate-500">No report attached.</p>
						)}
					</div>
				</div>
			) : null}
		</Modal>
	);
}

function Section({ label, value }: { label: string; value: string | null }) {
	return (
		<div>
			<p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
				{label}
			</p>
			<p className="mt-1 text-sm whitespace-pre-wrap text-slate-800">
				{value && value.length > 0 ? value : "—"}
			</p>
		</div>
	);
}

function EditRecordModal({
	record,
	onClose,
	onUpdated,
}: {
	record: MedicalRecord | null;
	onClose: () => void;
	onUpdated: () => void;
}) {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

	useEffect(() => {
		if (record) {
			reset({
				diagnosis: record.diagnosis,
				prescription: record.prescription ?? "",
				treatmentPlan: record.treatmentPlan ?? "",
			});
		}
	}, [record, reset]);

	const updateMutation = useMutation({
		mutationFn: (values: EditFormValues) =>
			api.patch<{ data: MedicalRecord }>(`/api/medical-records/${record!.id}`, {
				...values,
				prescription: values.prescription || undefined,
				treatmentPlan: values.treatmentPlan || undefined,
			}),
		onSuccess: () => {
			toast.success("Medical record updated");
			onUpdated();
		},
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to update record",
			),
	});

	const close = () => {
		reset();
		onClose();
	};

	return (
		<Modal
			open={record !== null}
			onClose={close}
			title="Edit medical record"
			subtitle={
				record ? `${record.patientName} · ${record.doctorName}` : undefined
			}
			size="lg"
		>
			<form
				onSubmit={handleSubmit((v) => updateMutation.mutate(v))}
				className="space-y-4"
			>
				<Field label="Diagnosis" error={errors.diagnosis?.message}>
					<Textarea
						placeholder="Primary diagnosis and clinical findings…"
						{...register("diagnosis")}
					/>
				</Field>
				<Field label="Prescription" error={errors.prescription?.message}>
					<Textarea
						placeholder="Medications and dosages…"
						{...register("prescription")}
					/>
				</Field>
				<Field label="Treatment plan" error={errors.treatmentPlan?.message}>
					<Textarea
						placeholder="Follow-up and care instructions…"
						{...register("treatmentPlan")}
					/>
				</Field>
				<div className="flex items-center justify-end gap-2">
					<Button type="button" variant="secondary" onClick={close}>
						Cancel
					</Button>
					<Button type="submit" loading={updateMutation.isPending}>
						<FileText className="size-4" /> Save changes
					</Button>
				</div>
			</form>
		</Modal>
	);
}

function UploadReportModal({
	record,
	onClose,
	onUploaded,
}: {
	record: MedicalRecord | null;
	onClose: () => void;
	onUploaded: () => void;
}) {
	const [file, setFile] = useState<File | null>(null);
	const uploadMutation = useMutation({
		mutationFn: () =>
			api.upload<{ data: MedicalRecord }>(
				`/api/medical-records/${record!.id}/report`,
				file!,
			),
		onSuccess: () => {
			toast.success("Report attached");
			setFile(null);
			onUploaded();
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Upload failed"),
	});

	return (
		<Modal
			open={record !== null}
			onClose={onClose}
			title="Attach report"
			subtitle={record ? `For record of ${record.patientName}` : undefined}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (!file) return;
					uploadMutation.mutate();
				}}
				className="space-y-4"
			>
				<label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-primary-500 hover:bg-primary-50">
					<Paperclip className="size-5 text-slate-400" />
					{file ? (
						<span className="text-sm font-medium text-slate-800">
							{file.name}
						</span>
					) : (
						<span className="text-sm text-slate-500">
							Click to choose a PDF or image (max 5MB)
						</span>
					)}
					<input
						type="file"
						accept=".pdf,image/*"
						className="sr-only"
						onChange={(e) => setFile(e.target.files?.[0] ?? null)}
					/>
				</label>
				<div className="flex items-center justify-end gap-2">
					<Button type="button" variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={!file}
						loading={uploadMutation.isPending}
					>
						Upload report
					</Button>
				</div>
			</form>
		</Modal>
	);
}
