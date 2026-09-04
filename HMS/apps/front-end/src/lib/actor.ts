import { useLocation } from "@tanstack/react-router";

import { ROLE_ID } from "./types.ts";

const ACTOR_SLUGS = [
	"super-admin",
	"admin",
	"doctor",
	"receptionist",
	"accountant",
	"patient",
] as const;

export type ActorSlug = (typeof ACTOR_SLUGS)[number];

export function actorPrefix(roleId: number): string {
	switch (roleId) {
		case ROLE_ID.SUPER_ADMIN:
			return "/super-admin";
		case ROLE_ID.ADMIN:
			return "/admin";
		case ROLE_ID.DOCTOR:
			return "/doctor";
		case ROLE_ID.RECEPTIONIST:
			return "/receptionist";
		case ROLE_ID.ACCOUNTANT:
			return "/accountant";
		case ROLE_ID.PATIENT:
			return "/patient";
		default:
			return "/login";
	}
}

export function slugToRoleId(slug: ActorSlug): number {
	switch (slug) {
		case "super-admin":
			return ROLE_ID.SUPER_ADMIN;
		case "admin":
			return ROLE_ID.ADMIN;
		case "doctor":
			return ROLE_ID.DOCTOR;
		case "receptionist":
			return ROLE_ID.RECEPTIONIST;
		case "accountant":
			return ROLE_ID.ACCOUNTANT;
		case "patient":
			return ROLE_ID.PATIENT;
	}
}

/**
 * Returns the actor prefix (e.g. "/admin", "/doctor") for the currently
 * matched route based on the pathname. Falls back to the first non-empty
 * segment, or "" when no actor segment is present.
 */
export function useActorPrefix(): string {
	const { pathname } = useLocation();
	const segment = pathname.split("/").filter(Boolean)[0];
	const slug = ACTOR_SLUGS.find((s) => s === segment);
	return slug ? `/${slug}` : "";
}
