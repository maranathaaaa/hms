import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/patient/")({
	component: PatientHomePage,
});

function PatientHomePage() {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
			<p className="text-3xl font-semibold tracking-tight text-slate-900">
				Patient portal
			</p>
			<p className="max-w-md text-sm text-slate-500">
				The patient-facing experience isn't built yet. This folder is ready for
				patient pages and can be modified independently.
			</p>
			<Link
				to="/doctor/dashboard"
				className="text-sm font-medium text-primary-600 hover:text-primary-700"
			>
				Go to a staff dashboard
			</Link>
		</div>
	);
}
