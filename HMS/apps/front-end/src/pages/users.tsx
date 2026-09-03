import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Plus, Trash2, UserCog } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { Field, Input, Select } from "../components/ui/field.tsx";
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
import type { Paginated, UserSummary } from "../lib/types.ts";
import { formatDateTime, titleCase } from "../lib/utils.ts";

const LIMIT = 10;

const ROLE_OPTIONS = [
	"SUPER_ADMIN",
	"ADMIN",
	"DOCTOR",
	"RECEPTIONIST",
	"ACCOUNTANT",
];

const userSchema = z
	.object({
		name: z.string().trim().min(1, "Name is required").max(255),
		email: z.string().trim().toLowerCase().email("Enter a valid email"),
		password: z
			.string()
			.min(8, "At least 8 characters")
			.regex(/[A-Za-z]/, "Must contain a letter")
			.regex(/\d/, "Must contain a number"),
		role: z.enum([
			"SUPER_ADMIN",
			"ADMIN",
			"DOCTOR",
			"RECEPTIONIST",
			"ACCOUNTANT",
		]),
		phone: z.string().trim().max(20).optional(),
		doctorProfile: z
			.object({
				specialization: z
					.string()
					.trim()
					.min(1, "Specialization is required")
					.max(150),
				department: z.string().trim().min(1, "Department is required").max(100),
				licenseNumber: z.string().trim().max(100).optional(),
				consultationFee: z
					.string()
					.regex(/^\d+(\.\d{1,2})?$/, "Enter a valid fee")
					.min(1, "Fee is required"),
			})
			.optional(),
	})
	.refine((v) => v.role !== "DOCTOR" || v.doctorProfile, {
		message: "Doctor profile details are required for a doctor account",
		path: ["doctorProfile"],
	});

type UserFormValues = z.infer<typeof userSchema>;

export function UsersPage() {
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [roleFilter, setRoleFilter] = useState("");
	const [createOpen, setCreateOpen] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ["users", page, roleFilter],
		queryFn: () =>
			api.get<Paginated<UserSummary>>("/api/users", {
				page,
				limit: LIMIT,
				role: roleFilter || undefined,
			}),
	});

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["users"] });

	const toggleActive = useMutation({
		mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
			api.patch<{ data: UserSummary }>(`/api/users/${id}/active`, { isActive }),
		onSuccess: () => {
			toast.success("User status updated");
			invalidate();
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Update failed"),
	});

	const changeRole = useMutation({
		mutationFn: ({ id, role }: { id: string; role: string }) =>
			api.patch<{ data: UserSummary }>(`/api/users/${id}/role`, { role }),
		onSuccess: () => {
			toast.success("Role updated");
			invalidate();
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Role update failed"),
	});

	const removeUser = useMutation({
		mutationFn: (id: string) => api.del(`/api/users/${id}`),
		onSuccess: () => {
			toast.success("User removed");
			invalidate();
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Delete failed"),
	});

	const users = data?.data ?? [];
	const meta = data?.meta;

	const { sorted, key, dir, toggle } = useSort(users, "name");

	return (
		<div className="space-y-5">
			<PageHeader
				title="Users"
				subtitle="Staff accounts and access roles"
				actions={
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="size-4" /> New user
					</Button>
				}
			/>

			<Card>
				<div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
					<label className="text-sm font-medium text-slate-600">Role</label>
					<Select
						value={roleFilter}
						onChange={(e) => {
							setPage(1);
							setRoleFilter(e.target.value);
						}}
						className="w-44"
					>
						<option value="">All roles</option>
						{ROLE_OPTIONS.map((role) => (
							<option key={role} value={role}>
								{titleCase(role)}
							</option>
						))}
					</Select>
				</div>

				{isLoading ? <Spinner /> : null}
				{error ? (
					<InlineError
						message={
							error instanceof Error ? error.message : "Failed to load users"
						}
					/>
				) : null}

				{!isLoading && !error && users.length === 0 ? (
					<EmptyState
						title="No users found"
						description="Provision staff accounts to grant access to the system."
						action={
							<Button onClick={() => setCreateOpen(true)}>
								<Plus className="size-4" /> New user
							</Button>
						}
					/>
				) : null}

				{!isLoading && !error && users.length > 0 ? (
					<>
						<Table>
							<TableHead>
								<SortableTh
									field="name"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Name
								</SortableTh>
								<SortableTh
									field="role"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Role
								</SortableTh>
								<SortableTh
									field="isActive"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Status
								</SortableTh>
								<SortableTh
									field="lastLoginAt"
									sortKey={key}
									sortDir={dir}
									onSort={toggle}
								>
									Last login
								</SortableTh>
								<Th className="text-right">Actions</Th>
							</TableHead>
							<TableBody>
								{sorted.map((user) => (
									<TableRow key={user.id}>
										<Td>
											<p className="font-medium text-slate-900">{user.name}</p>
											<p className="text-xs text-slate-500">{user.email}</p>
										</Td>
										<Td>
											<div className="flex items-center gap-2">
												<Badge
													tone={
														user.role === "ADMIN" || user.role === "SUPER_ADMIN"
															? "accent"
															: "neutral"
													}
												>
													{titleCase(user.role)}
												</Badge>
											</div>
										</Td>
										<Td>
											{user.isActive ? (
												<Badge tone="success">Active</Badge>
											) : (
												<Badge tone="danger">Suspended</Badge>
											)}
										</Td>
										<Td className="whitespace-nowrap text-slate-500">
											{formatDateTime(user.lastLoginAt)}
										</Td>
										<Td className="text-right">
											<div className="inline-flex items-center gap-1">
												<Select
													value={user.role}
													onChange={(e) =>
														changeRole.mutate({
															id: user.id,
															role: e.target.value,
														})
													}
													className="w-36 py-1.5 text-xs"
													aria-label={`Change role for ${user.name}`}
												>
													{ROLE_OPTIONS.map((role) => (
														<option key={role} value={role}>
															{titleCase(role)}
														</option>
													))}
												</Select>
												{user.isActive ? (
													<Button
														variant="ghost"
														size="sm"
														title="Suspend"
														onClick={() =>
															toggleActive.mutate({
																id: user.id,
																isActive: false,
															})
														}
													>
														<Ban className="size-4" />
													</Button>
												) : (
													<Button
														variant="ghost"
														size="sm"
														title="Reactivate"
														className="hover:bg-emerald-50 hover:text-emerald-600"
														onClick={() =>
															toggleActive.mutate({
																id: user.id,
																isActive: true,
															})
														}
													>
														<CheckCircle2 className="size-4" />
													</Button>
												)}
												<Button
													variant="ghost"
													size="sm"
													className="hover:bg-rose-50 hover:text-rose-600"
													onClick={() => {
														if (confirm(`Remove user ${user.name}?`))
															removeUser.mutate(user.id);
													}}
													aria-label={`Remove ${user.name}`}
												>
													<Trash2 className="size-4" />
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

			<CreateUserModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreated={() => {
					setCreateOpen(false);
					invalidate();
				}}
			/>
		</div>
	);
}

function CreateUserModal({
	open,
	onClose,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	onCreated: () => void;
}) {
	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors },
	} = useForm<UserFormValues>({
		resolver: zodResolver(userSchema),
		defaultValues: { role: "RECEPTIONIST" },
	});

	const role = watch("role");

	const createMutation = useMutation({
		mutationFn: (values: UserFormValues) =>
			api.post<{ data: UserSummary }>("/api/users", {
				...values,
				phone: values.phone || undefined,
				doctorProfile: values.doctorProfile || undefined,
			}),
		onSuccess: () => {
			toast.success("User created");
			reset({ role: "RECEPTIONIST" });
			onCreated();
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to create user"),
	});

	return (
		<Modal
			open={open}
			onClose={onClose}
			title="Create user"
			subtitle="Provision a new staff account"
			size="lg"
		>
			<form
				onSubmit={handleSubmit((v) => createMutation.mutate(v))}
				className="grid grid-cols-1 gap-4 sm:grid-cols-2"
			>
				<Field label="Full name" error={errors.name?.message}>
					<Input placeholder="Jane Doe" {...register("name")} />
				</Field>
				<Field label="Email" error={errors.email?.message}>
					<Input
						type="email"
						placeholder="jane@hospital.local"
						{...register("email")}
					/>
				</Field>
				<Field
					label="Temporary password"
					error={errors.password?.message}
					hint="At least 8 characters, with a letter and a number."
					className="sm:col-span-2"
				>
					<Input
						type="password"
						placeholder="••••••••"
						{...register("password")}
					/>
				</Field>
				<Field label="Role" error={errors.role?.message}>
					<Select {...register("role")}>
						{ROLE_OPTIONS.map((r) => (
							<option key={r} value={r}>
								{titleCase(r)}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Phone" error={errors.phone?.message}>
					<Input placeholder="+1-555-0100" {...register("phone")} />
				</Field>

				{role === "DOCTOR" ? (
					<>
						<div className="border-t border-slate-200 pt-1 sm:col-span-2">
							<p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
								<UserCog className="size-4" /> Doctor profile
							</p>
						</div>
						<Field
							label="Specialization"
							error={errors.doctorProfile?.specialization?.message}
						>
							<Input
								placeholder="Cardiology"
								{...register("doctorProfile.specialization")}
							/>
						</Field>
						<Field
							label="Department"
							error={errors.doctorProfile?.department?.message}
						>
							<Input
								placeholder="Heart & Vascular"
								{...register("doctorProfile.department")}
							/>
						</Field>
						<Field
							label="License number"
							error={errors.doctorProfile?.licenseNumber?.message}
						>
							<Input
								placeholder="MED-LIC-2026-0001"
								{...register("doctorProfile.licenseNumber")}
							/>
						</Field>
						<Field
							label="Consultation fee"
							error={errors.doctorProfile?.consultationFee?.message}
							hint="Charged when a visit is completed."
						>
							<Input
								placeholder="80.00"
								{...register("doctorProfile.consultationFee")}
							/>
						</Field>
					</>
				) : null}

				<div className="flex items-center justify-end gap-2 pt-2 sm:col-span-2">
					<Button type="button" variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" loading={createMutation.isPending}>
						<Plus className="size-4" /> Create user
					</Button>
				</div>
			</form>
		</Modal>
	);
}
