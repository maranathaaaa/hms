import { createAuthClient } from "better-auth/react";
import { AUTH_BASE_URL } from "../config/env";

export const authClient = createAuthClient({
	// Absolute backend origin from `VITE_API_URL`; Better Auth appends its
	// `/api/auth` base path, matching the server's `basePath`.
	baseURL: AUTH_BASE_URL,
});

export type AuthClient = typeof authClient;
