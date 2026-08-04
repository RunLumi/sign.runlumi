import { ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
	return (
		<span className="relative block">
			<select
				data-slot="native-select"
				className={cn(
					"h-9 w-full appearance-none rounded-md border border-input bg-transparent py-1 pr-8 pl-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
					className,
				)}
				{...props}
			>
				{children}
			</select>
			<ChevronDown
				aria-hidden="true"
				className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2.5 size-4 text-muted-foreground"
			/>
		</span>
	);
}
