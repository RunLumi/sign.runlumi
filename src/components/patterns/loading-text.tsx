import type * as React from "react";
import { cn } from "@/lib/utils";

/** Consistent inline loading/status line. Renders an aria-live <output>. */
export function LoadingText({
	boxed = false,
	className,
	...props
}: React.ComponentProps<"output"> & { boxed?: boolean }) {
	return (
		<output
			aria-live="polite"
			className={cn(
				"block text-muted-foreground text-sm",
				boxed && "rounded-xl border bg-card p-5 shadow-xs sm:p-6",
				className,
			)}
			{...props}
		/>
	);
}
