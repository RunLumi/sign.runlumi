import { useQuery } from "@tanstack/react-query";
import { PDFDocument } from "pdf-lib";
import type { MouseEvent, PointerEvent, RefObject } from "react";
import { useEffect, useRef } from "react";
import {
	type EnvelopeFieldResponse,
	type FieldEditorRecipient,
	FieldOverlay,
	type PlacedField,
} from "./field-placement-workspace";
import { loadPlacementPdf, PdfPageCanvas } from "./pdf-page-canvas";

type DragEvent = PointerEvent<HTMLElement> | MouseEvent<HTMLElement>;

export function ScrollablePdfPlacement({
	sourcePdfPreviewUrl,
	currentField,
	placedFields,
	recipients,
	previewRef,
	onSelectPage,
	onStartDragging,
	onContinueDragging,
	onStopDragging,
}: {
	sourcePdfPreviewUrl?: string;
	currentField: PlacedField | null;
	placedFields: EnvelopeFieldResponse[];
	recipients: FieldEditorRecipient[];
	previewRef: RefObject<HTMLFieldSetElement | null>;
	onSelectPage: (page: number) => void;
	onStartDragging: (event: DragEvent, field: PlacedField) => void;
	onContinueDragging: (event: DragEvent, field: PlacedField) => void;
	onStopDragging: () => void;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const pageRefs = useRef(new Map<number, HTMLFieldSetElement>());
	const url = sourcePdfPreviewUrl?.split("#")[0];
	const pages = useQuery({
		queryKey: ["placement-pdf-pages", url],
		enabled: Boolean(url),
		queryFn: async () => {
			const response = await fetch(url ?? "");
			if (!response.ok) throw new Error("Unable to load PDF");
			const bytes = await response.arrayBuffer();
			const pdf = await PDFDocument.load(bytes);
			const document = await loadPlacementPdf(bytes);
			return {
				document,
				dimensions: pdf
					.getPages()
					.map((page, index) => ({ ...page.getSize(), pageNumber: index + 1 })),
			};
		},
		retry: false,
		staleTime: Infinity,
	});
	const selectedPage = currentField?.page ?? 1;
	const dimensions = pages.data?.dimensions ?? [{ width: 612, height: 792, pageNumber: 1 }];
	useEffect(() => {
		previewRef.current = pageRefs.current.get(selectedPage) ?? null;
	}, [selectedPage, previewRef]);
	function selectVisiblePage() {
		const root = scrollRef.current;
		if (!root) return;
		const bounds = root.getBoundingClientRect();
		const middle = bounds.top + bounds.height / 2;
		const selected = [...pageRefs.current].find(([, page]) => {
			const box = page.getBoundingClientRect();
			return box.top <= middle && box.bottom > middle;
		});
		if (selected && selected[0] !== selectedPage) onSelectPage(selected[0]);
	}
	function jumpToPage(page: number) {
		onSelectPage(page);
		pageRefs.current.get(page)?.scrollIntoView({ block: "start" });
	}
	return (
		<div className="space-y-3">
			<label className="flex items-center gap-2 text-sm">
				PDF page
				<select
					aria-label="PDF page"
					value={selectedPage}
					onChange={(event) => jumpToPage(Number(event.target.value))}
					className="rounded border bg-background p-2"
				>
					{dimensions.map(({ pageNumber }) => (
						<option key={pageNumber} value={pageNumber}>
							Page {pageNumber} of {dimensions.length}
						</option>
					))}
				</select>
			</label>
			{pages.isError ? (
				<p role="alert" className="text-destructive text-sm">
					Unable to read the PDF pages. Reload the document before placing fields.
				</p>
			) : null}
			{pages.isLoading ? <output>Loading PDF pages…</output> : null}
			<section
				ref={scrollRef}
				aria-label="Scrollable PDF pages"
				className="max-h-[75vh] space-y-6 overflow-y-auto rounded-lg border bg-muted/30 p-3"
				onScroll={selectVisiblePage}
			>
				{dimensions.map((size) => {
					const page = size.pageNumber;
					const active = currentField?.page === page ? currentField : null;
					return (
						<div key={page} data-testid={`pdf-page-${page}`} className="space-y-2">
							<button
								type="button"
								aria-pressed={page === selectedPage}
								onClick={() => onSelectPage(page)}
								className="text-sm font-medium"
							>
								Page {page}
							</button>
							<fieldset
								ref={(element) => {
									if (element) pageRefs.current.set(page, element);
									else pageRefs.current.delete(page);
									if (page === selectedPage) previewRef.current = element;
								}}
								aria-label={page === selectedPage ? "PDF page preview" : `PDF page ${page} preview`}
								style={{ aspectRatio: `${size.width}/${size.height}` }}
								className="relative w-full overflow-hidden rounded border bg-white text-slate-950"
								onPointerMove={(event) => active && onContinueDragging(event, active)}
								onPointerUp={onStopDragging}
								onPointerCancel={onStopDragging}
								onMouseMove={(event) => active && onContinueDragging(event, active)}
								onMouseUp={onStopDragging}
							>
								<legend className="sr-only">PDF page {page}</legend>
								{pages.data ? <PdfPageCanvas document={pages.data.document} page={page} /> : null}
								{placedFields
									.filter((field) => field.page === page)
									.map((field) => (
										<FieldOverlay
											key={field.id}
											field={field}
											recipientName={
												recipients.find((recipient) => recipient.id === field.recipientId)?.name ??
												"Signer"
											}
											colorIndex={recipients.findIndex(
												(recipient) => recipient.id === field.recipientId,
											)}
											isCurrent={false}
										/>
									))}
								{active ? (
									<FieldOverlay
										field={active}
										recipientName={
											recipients.find((recipient) => recipient.id === active.recipientId)?.name ??
											"Signer"
										}
										colorIndex={recipients.findIndex(
											(recipient) => recipient.id === active.recipientId,
										)}
										isCurrent
										onPointerDown={(event) => onStartDragging(event, active)}
										onMouseDown={(event) => onStartDragging(event, active)}
									/>
								) : null}
							</fieldset>
						</div>
					);
				})}
			</section>
			<p className="text-muted-foreground text-sm">
				Scroll or choose a page, drag the signature box, then save. Add more signatures on any page.
			</p>
		</div>
	);
}
