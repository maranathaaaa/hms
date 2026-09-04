import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

import { queryClient } from "./lib/query.ts";
import { router } from "./router.ts";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Analytics />
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
			<Toaster
				position="top-right"
				toastOptions={{
					className:
						"!rounded-lg !border !border-slate-200 !bg-white !text-slate-900",
				}}
			/>
		</QueryClientProvider>
	</StrictMode>,
);
