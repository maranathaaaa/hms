import { API_BASE_URL } from "../config/env";

export class ApiError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(message: string, code: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
	}
}

interface ApiErrorBody {
	error?: { code?: string; message?: string };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const headers: Record<string, string> = {
		...(options.body instanceof FormData
			? {}
			: { "Content-Type": "application/json" }),
		...(options.headers as Record<string, string>),
	};

	const res = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		headers,
		credentials: "include",
	});

	if (!res.ok) {
		let code = "UNKNOWN";
		let message = `Request failed (${res.status})`;
		try {
			const body = (await res.json()) as ApiErrorBody;
			if (body?.error?.message) message = body.error.message;
			if (body?.error?.code) code = body.error.code;
		} catch {
			// non-JSON error body — keep defaults
		}
		throw new ApiError(message, code, res.status);
	}

	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}

export const api = {
	get: <T>(path: string, params?: Record<string, unknown>) => {
		const search = params
			? "?" +
				Object.entries(params)
					.filter(
						([, value]) =>
							value !== undefined && value !== null && value !== "",
					)
					.map(
						([key, value]) =>
							`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
					)
					.join("&")
			: "";
		return request<T>(`${path}${search}`);
	},
	post: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "POST",
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
	patch: <T>(path: string, body?: unknown) =>
		request<T>(path, {
			method: "PATCH",
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
	del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
	upload: <T>(path: string, file: File) => {
		const form = new FormData();
		form.append("file", file);
		return request<T>(path, { method: "POST", body: form });
	},
};
