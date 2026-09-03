import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "../components/ui/button.tsx";
import { Card, CardContent, CardHeader } from "../components/ui/card.tsx";
import { Field, Input } from "../components/ui/field.tsx";
import { InlineError, PageHeader, Spinner } from "../components/ui/page.tsx";
import { api } from "../lib/api.ts";
import { authClient } from "../lib/auth-client.ts";
import { type Doctor, ROLE_ID, type SessionUser } from "../lib/types.ts";
import { formatCurrency } from "../lib/utils.ts";

const profileSchema = z.object({
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
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function DoctorProfilePage() {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();

	const isDoctor =
		(session?.user as SessionUser | null | undefined)?.roleId ===
		ROLE_ID.DOCTOR;

	const { data, isLoading, error } = useQuery({
		queryKey: ["doctor", "me"],
		queryFn: () => api.get<{ data: Doctor }>("/api/doctors/me/profile"),
		enabled: isDoctor,
	});

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

	const profile = data?.data;

	useEffect(() => {
		if (profile) {
			reset({
				specialization: profile.specialization,
				department: profile.department,
				licenseNumber: profile.licenseNumber ?? "",
				consultationFee: profile.consultationFee,
			});
		}
	}, [profile, reset]);

	const saveMutation = useMutation({
		mutationFn: (values: ProfileFormValues) =>
			api.patch<{ data: Doctor }>(`/api/doctors/${profile!.id}`, {
				...values,
				licenseNumber: values.licenseNumber || undefined,
			}),
		onSuccess: () => {
			toast.success("Profile updated");
			queryClient.invalidateQueries({ queryKey: ["doctor", "me"] });
		},
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Update failed"),
	});

	return (
		<div className="space-y-5">
			<PageHeader
				title="My Profile"
				subtitle="Your professional details and consultation fee"
			/>

			{isLoading ? <Spinner /> : null}
			{error ? (
				<InlineError
					message={
						error instanceof Error ? error.message : "Failed to load profile"
					}
				/>
			) : null}

			{profile ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<Card>
						<CardHeader title="Account" subtitle="Sign-in details" />
						<CardContent>
							<dl className="divide-y divide-slate-200">
								<div className="flex items-center justify-between py-2.5">
									<dt className="text-sm text-slate-500">Name</dt>
									<dd className="text-sm font-medium text-slate-900">
										{profile.name}
									</dd>
								</div>
								<div className="flex items-center justify-between py-2.5">
									<dt className="text-sm text-slate-500">Email</dt>
									<dd className="text-sm font-medium text-slate-900">
										{profile.email}
									</dd>
								</div>
								<div className="flex items-center justify-between py-2.5">
									<dt className="text-sm text-slate-500">Status</dt>
									<dd className="text-sm font-medium text-emerald-700">
										{profile.isActive ? "Active" : "Inactive"}
									</dd>
								</div>
							</dl>
						</CardContent>
					</Card>

					<Card className="lg:col-span-2">
						<CardHeader
							title="Professional details"
							subtitle="Shown to staff when scheduling visits"
						/>
						<CardContent>
							<form
								onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
								className="grid grid-cols-1 gap-4 sm:grid-cols-2"
							>
								<Field
									label="Specialization"
									error={errors.specialization?.message}
								>
									<Input {...register("specialization")} />
								</Field>
								<Field label="Department" error={errors.department?.message}>
									<Input {...register("department")} />
								</Field>
								<Field
									label="License number"
									error={errors.licenseNumber?.message}
								>
									<Input {...register("licenseNumber")} />
								</Field>
								<Field
									label="Consultation fee"
									error={errors.consultationFee?.message}
									hint={`Current: ${formatCurrency(profile.consultationFee)}`}
								>
									<Input {...register("consultationFee")} />
								</Field>
								<div className="flex justify-end pt-2 sm:col-span-2">
									<Button type="submit" loading={saveMutation.isPending}>
										Save changes
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			) : null}
		</div>
	);
}
