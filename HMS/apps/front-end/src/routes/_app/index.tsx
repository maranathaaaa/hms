import { Navigate, createFileRoute } from "@tanstack/react-router";

import { authClient } from "../../lib/auth-client.ts";
import { actorPrefix } from "../../lib/actor.ts";
import type { SessionUser } from "../../lib/types.ts";

function ActorRedirect() {
	const { data, isPending } = authClient.useSession();
	if (isPending) return null;
	const user = data?.user as SessionUser | undefined;
	const to = user ? `${actorPrefix(user.roleId)}/dashboard` : "/login";
	return <Navigate to={to as never} replace />;
}

export const Route = createFileRoute("/_app/")({
	component: ActorRedirect,
});
