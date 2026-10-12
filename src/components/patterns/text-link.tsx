import { IconArrowLeft as ArrowLeft } from "@tabler/icons-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** Canonical inline link style; also usable on router <Link> elements. */
export const textLinkClass =
	"rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2";

export function TextLink({ className, ...props }: React.ComponentProps<"a">) {
	return <a data-slot="text-link" className={cn(textLinkClass, className)} {...props} />;
}

const backLinkClass =
	"inline-flex items-center gap-1.5 rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2";

export function BackLink({
	href,
	onClick,
	className,
	children,
}: {
	href?: string;
	onClick?: () => void;
	className?: string;
	children: React.ReactNode;
}) {
	const content = (
		<>
			<ArrowLeft aria-hidden="true" className="size-4" />
			{children}
		</>
	);
	if (href) {
		return (
			<a
				data-slot="back-link"
				href={href}
				onClick={onClick}
				className={cn(backLinkClass, className)}
			>
				{content}
			</a>
		);
	}
	return (
		<button
			data-slot="back-link"
			type="button"
			onClick={onClick}
			className={cn(backLinkClass, className)}
		>
			{content}
		</button>
	);
}
