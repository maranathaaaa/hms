import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate } from "@tanstack/react-router";
import {
	CalendarCheck,
	Check,
	FileText,
	HeartPulse,
	LockKeyhole,
	ReceiptText,
	ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../components/ui/button.tsx";
import { CopyButton } from "../components/ui/copy-button.tsx";
import { Field, Input } from "../components/ui/field.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { authClient } from "../lib/auth-client.ts";
import { actorPrefix } from "../lib/actor.ts";
import type { SessionUser } from "../lib/types.ts";

const schema = z.object({
	email: z.string().email("Enter a valid email address"),
	password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
	{
		role: "Administrator",
		email: "admin@hospital.local",
		password: "AdminPassw0rd!2026",
	},
	{
		role: "Doctor",
		email: "dr.owen@hospital.local",
		password: "DoctorPassw0rd!2026",
	},
	{
		role: "Receptionist",
		email: "frontdesk@hospital.local",
		password: "FrontDeskPassw0rd!2026",
	},
];

const FEATURES = [
	{
		icon: CalendarCheck,
		label: "Patient & Appointment Management",
		detail: "Schedule visits and manage patient workflows efficiently.",
	},
	{
		icon: FileText,
		label: "Electronic Medical Records",
		detail: "Access secure, organized patient histories instantly.",
	},
	{
		icon: ReceiptText,
		label: "Billing & Operations",
		detail: "Simplify invoicing, payments, and administrative tasks.",
	},
	{
		icon: ShieldCheck,
		label: "Secure Role-Based Access",
		detail: "Give each staff member the right level of access.",
	},
];

export function LoginPage() {
	const { data, isPending: sessionPending } = authClient.useSession();
	const [submitting, setSubmitting] = useState(false);
	const [remember, setRemember] = useState(true);

	const [resetOpen, setResetOpen] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [resetEmail, setResetEmail] = useState("");

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema) });

	if (!sessionPending && data?.user) {
		const user = data.user as unknown as SessionUser;
		return (
			<Navigate to={`${actorPrefix(user.roleId)}/dashboard` as never} replace />
		);
	}

	const onSubmit = async (values: FormValues) => {
		setSubmitting(true);
		const { error } = await authClient.signIn.email({
			email: values.email,
			password: values.password,
			rememberMe: remember,
		});
		setSubmitting(false);

		if (error) {
			toast.error(error.message ?? "Unable to sign in");
			return;
		}
		toast.success("Welcome back");
	};

	const onRequestReset = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setResetting(true);
		try {
			const { error } = await authClient.requestPasswordReset({
				email: resetEmail,
			});
			if (error) throw error;
			toast.success(
				"If an account exists for that email, a reset link has been sent.",
			);
		} catch {
			toast.error("Password reset isn't configured for this demo.");
		} finally {
			setResetting(false);
			setResetOpen(false);
		}
	};

	return (
		<div className="flex min-h-screen bg-white">
			<div className="hidden min-h-screen w-1/2 items-center justify-center border-r border-slate-200 px-12 lg:flex">
				<div className="w-full max-w-md">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-md border border-slate-200">
							<HeartPulse className="size-4 text-primary-600" />
						</div>
						<div>
							<p className="text-sm font-semibold text-slate-900">NexaCare</p>
							<p className="text-xs text-slate-500">
								Hospital Management System
							</p>
						</div>
					</div>

					<h1 className="mt-12 text-4xl leading-tight font-semibold tracking-tight text-slate-900">
						Everything your hospital needs, in one place.
					</h1>
					<p className="mt-5 text-base leading-relaxed text-slate-600">
						NexaCare helps hospitals and clinics manage patients, appointments,
						medical records, billing, staff, and day-to-day operations through
						one secure and intuitive platform.
					</p>

					<div className="mt-12 space-y-6">
						{FEATURES.map((feature) => (
							<div key={feature.label} className="flex gap-3.5">
								<feature.icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
								<div>
									<p className="text-sm font-medium text-slate-900">
										{feature.label}
									</p>
									<p className="mt-0.5 text-sm leading-relaxed text-slate-500">
										{feature.detail}
									</p>
								</div>
							</div>
						))}
					</div>

					<p className="mt-12 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
						<ShieldCheck className="mt-px size-4 shrink-0 text-slate-400" />
						Built for modern healthcare teams with secure authentication,
						role-based permissions, and reliable data protection.
					</p>
				</div>
			</div>

			<div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-16">
				<div className="w-full max-w-sm">
					<div className="mb-8 flex flex-col items-center text-center lg:hidden">
						<div className="flex size-10 items-center justify-center rounded-md border border-slate-200 bg-white">
							<HeartPulse className="size-5 text-primary-600" />
						</div>
						<p className="mt-3 text-base font-semibold text-slate-900">
							NexaCare
						</p>
						<p className="mt-0.5 text-sm text-slate-500">
							Sign in to access your dashboard
						</p>
					</div>

					<div className="rounded-lg border border-slate-200 bg-white p-8">
						<h2 className="text-xl font-semibold tracking-tight text-slate-900">
							Welcome back
						</h2>
						<p className="mt-1.5 text-sm text-slate-500">
							Sign in to access your NexaCare dashboard.
						</p>

						<form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
							<Field label="Email" error={errors.email?.message}>
								<Input
									type="email"
									autoComplete="email"
									placeholder="you@hospital.local"
									{...register("email")}
								/>
							</Field>

							<Field label="Password" error={errors.password?.message}>
								<Input
									type="password"
									autoComplete="current-password"
									placeholder="••••••••"
									{...register("password")}
								/>
							</Field>

							<div className="flex items-center justify-between pt-1">
								<label className="flex cursor-pointer items-center gap-2 select-none">
									<input
										type="checkbox"
										checked={remember}
										onChange={(e) => setRemember(e.target.checked)}
										className="peer sr-only"
									/>
									<span
										className={
											"flex size-4 shrink-0 items-center justify-center rounded border " +
											"border-slate-300 bg-white text-white transition-colors " +
											"peer-checked:border-primary-600 peer-checked:bg-primary-600 " +
											"peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30 peer-focus-visible:outline-none"
										}
									>
										<Check className="size-3" strokeWidth={3} />
									</span>
									<span className="text-sm text-slate-600">Remember me</span>
								</label>

								<button
									type="button"
									onClick={() => setResetOpen(true)}
									className="text-sm font-medium text-primary-600 hover:text-primary-700"
								>
									Forgot password?
								</button>
							</div>

							<Button type="submit" className="w-full" loading={submitting}>
								{submitting ? "Signing in…" : "Sign in"}
							</Button>
						</form>
					</div>

					<div className="mt-8">
						<p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
							Demo accounts
						</p>
						<div className="mt-3 space-y-2.5">
							{DEMO_ACCOUNTS.map((account) => (
								<div
									key={account.role}
									className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
								>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-slate-900">
											{account.role}
										</p>
										<p className="truncate font-mono text-xs text-slate-500">
											{account.email}
										</p>
										<p className="truncate font-mono text-[11px] text-slate-400">
											{account.password}
										</p>
									</div>
									<CopyButton
										value={account.email}
										label={`${account.role} email`}
										className="shrink-0"
									/>
									<CopyButton
										value={account.password}
										label={`${account.role} password`}
										className="shrink-0"
									/>
								</div>
							))}
						</div>
					</div>

					<p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
						<LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
						Access is protected using secure authentication and role-based
						permissions.
					</p>
				</div>
			</div>

			<Modal
				open={resetOpen}
				onClose={() => setResetOpen(false)}
				title="Reset your password"
				subtitle="We'll email you a secure link to set a new password."
			>
				<form onSubmit={onRequestReset} className="space-y-4">
					<Field label="Email">
						<Input
							type="email"
							autoComplete="email"
							placeholder="you@hospital.local"
							value={resetEmail}
							onChange={(e) => setResetEmail(e.target.value)}
							required
						/>
					</Field>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => setResetOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" loading={resetting}>
							Send reset link
						</Button>
					</div>
				</form>
			</Modal>
		</div>
	);
}
