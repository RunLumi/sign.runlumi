import { textLinkClass } from "@/components/patterns/text-link";

export function HistoryCatalogLink({ href, label }: { href: string; label: string }) {
	return (
		<a className={textLinkClass} href={href}>
			{label}
		</a>
	);
}
