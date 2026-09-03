import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { cn } from "../../lib/utils.ts";
import { Th } from "./table.tsx";

export type SortDir = "asc" | "desc";

function compareValues(a: unknown, b: unknown): number {
	if (a === null || a === undefined || a === "") return 1;
	if (b === null || b === undefined || b === "") return -1;
	if (typeof a === "number" && typeof b === "number") return a - b;
	const av = String(a).toLowerCase();
	const bv = String(b).toLowerCase();
	return av < bv ? -1 : av > bv ? 1 : 0;
}

/** Client-side sorting for the current page of rows. */
export function useSort<T>(rows: T[], initialKey?: string) {
	const [key, setKey] = useState<string | null>(initialKey ?? null);
	const [dir, setDir] = useState<SortDir>("asc");

	const sorted = useMemo(() => {
		if (!key) return rows;
		const copy = [...rows];
		copy.sort((a, b) => {
			const av = (a as Record<string, unknown>)[key];
			const bv = (b as Record<string, unknown>)[key];
			return dir === "asc" ? compareValues(av, bv) : compareValues(bv, av);
		});
		return copy;
	}, [rows, key, dir]);

	const toggle = (nextKey: string) => {
		if (key === nextKey) {
			setDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setKey(nextKey);
			setDir("asc");
		}
	};

	return { sorted, key, dir, toggle };
}

export function SortableTh({
	field,
	sortKey,
	sortDir,
	onSort,
	align = "left",
	className,
	children,
}: {
	field: string;
	sortKey: string | null;
	sortDir: SortDir;
	onSort: (field: string) => void;
	align?: "left" | "right";
	className?: string;
	children?: ReactNode;
}) {
	const isActive = sortKey === field;
	return (
		<Th className={className}>
			<button
				type="button"
				onClick={() => onSort(field)}
				className={cn(
					"inline-flex w-full items-center gap-1 transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none",
					align === "right" && "justify-end",
				)}
			>
				{children}
				{isActive ? (
					sortDir === "asc" ? (
						<ArrowUp className="size-3 shrink-0" />
					) : (
						<ArrowDown className="size-3 shrink-0" />
					)
				) : (
					<ChevronsUpDown className="size-3 shrink-0 opacity-40" />
				)}
			</button>
		</Th>
	);
}
