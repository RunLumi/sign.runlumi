import {
	IconCircleCheck as CheckCircle2,
	IconCircle as Circle,
	IconDeviceFloppy as Save,
} from "@tabler/icons-react";
import type { MouseEvent, PointerEvent, RefObject } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollablePdfPlacement } from "./scrollable-pdf-placement";

export interface FieldEditorRecipient {
	id: string;
	name: string;
	email: string;
}

type FieldType = "signature" | "date";

export type PlacedField = {
	recipientId: string;
	type: FieldType;
	page: number;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type EnvelopeFieldResponse = PlacedField & {
	id: string;
	envelopeId: string;
	createdAt: string;
};

export const pdfPage = {
	width: 612,
	height: 792,
} as const;

export const signatureDimensions = { width: 180, height: 48 } as const;

type FieldPlacementWorkspaceProps = {
	values: PlacedField;
	recipients: FieldEditorRecipient[];
	signatureRecipientIds: Set<string>;
	placedFields: EnvelopeFieldResponse[];
	sourcePdfPreviewUrl?: string;
	allSignaturesPlaced: boolean;
	isSaving: boolean;
	isSaveError: boolean;
	isDeleting: boolean;
	isDeleteError: boolean;
	previewRef: RefObject<HTMLFieldSetElement | null>;
	onSelectRecipient: (recipientId: string) => void;
	onSelectPage: (page: number) => void;
	onSubmit: () => void;
	onDeleteField: (fieldId: string) => void;
	onStartDragging: (
		event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>,
		field: PlacedField,
	) => void;
	onContinueDragging: (
		event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>,
		field: PlacedField,
	) => void;
	onStopDragging: () => void;
};

export function FieldPlacementWorkspace({
	values,
	recipients,
	signatureRecipientIds,
	placedFields,
	sourcePdfPreviewUrl,
	allSignaturesPlaced,
	isSaving,
	isSaveError,
	isDeleting,
	isDeleteError,
	previewRef,
	onSelectRecipient,
	onSelectPage,
	onSubmit,
	onDeleteField,
	onStartDragging,
	onContinueDragging,
	onStopDragging,
}: FieldPlacementWorkspaceProps) {
	const activeRecipient = getActiveRecipient(recipients, signatureRecipientIds, values.recipientId);
	const currentField = activeRecipient
		? buildNextSignatureField(values, recipients, signatureRecipientIds, placedFields)
		: null;

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
			<ScrollablePdfPlacement
				recipients={recipients}
				placedFields={placedFields}
				currentField={currentField}
				sourcePdfPreviewUrl={sourcePdfPreviewUrl}
				previewRef={previewRef}
				onSelectPage={onSelectPage}
				onStartDragging={onStartDragging}
				onContinueDragging={onContinueDragging}
				onStopDragging={onStopDragging}
			/>
			<SignaturePlacementActions
				recipients={recipients}
				activeRecipient={activeRecipient}
				signatureRecipientIds={signatureRecipientIds}
				placedFields={placedFields}
				isSaving={isSaving}
				isSaveError={isSaveError}
				isDeleting={isDeleting}
				isDeleteError={isDeleteError}
				allSignaturesPlaced={allSignaturesPlaced}
				onSelectRecipient={onSelectRecipient}
				onSubmit={onSubmit}
				onDeleteField={onDeleteField}
			/>
		</div>
	);
}

function SignaturePlacementActions({
	recipients,
	activeRecipient,
	signatureRecipientIds,
	placedFields,
	isSaving,
	isSaveError,
	isDeleting,
	isDeleteError,
	allSignaturesPlaced,
	onSelectRecipient,
	onSubmit,
	onDeleteField,
}: {
	recipients: FieldEditorRecipient[];
	activeRecipient: FieldEditorRecipient | null;
	signatureRecipientIds: Set<string>;
	placedFields: EnvelopeFieldResponse[];
	isSaving: boolean;
	isSaveError: boolean;
	isDeleting: boolean;
	isDeleteError: boolean;
	allSignaturesPlaced: boolean;
	onSelectRecipient: (recipientId: string) => void;
	onSubmit: () => void;
	onDeleteField: (fieldId: string) => void;
}) {
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onSubmit();
			}}
			className="space-y-4"
		>
			{allSignaturesPlaced ? <output>All signers have signature placeholders.</output> : null}
			<RecipientPlacementList
				recipients={recipients}
				activeRecipientId={activeRecipient?.id ?? null}
				signatureRecipientIds={signatureRecipientIds}
				onSelect={onSelectRecipient}
			/>
			{placedFields.length > 0 ? (
				<section aria-labelledby="placed-fields-heading" className="space-y-2">
					<h3 id="placed-fields-heading" className="font-medium text-sm">
						Placed fields
					</h3>
					<ul className="space-y-2">
						{placedFields.map((field) => {
							const recipientName =
								recipients.find((recipient) => recipient.id === field.recipientId)?.name ??
								"Signer";
							return (
								<li
									key={field.id}
									className="flex items-center justify-between gap-3 rounded-lg border p-3"
								>
									<span className="min-w-0 text-sm">
										<span className="block truncate font-medium">{recipientName}</span>
										<span className="text-muted-foreground capitalize">
											{field.type} · page {field.page}
										</span>
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isDeleting}
										aria-label={`Clear ${recipientName} ${field.type} on page ${field.page}`}
										onClick={() => onDeleteField(field.id)}
									>
										{isDeleting ? "Clearing…" : "Clear"}
									</Button>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}
			<Button type="submit" className="w-full" disabled={isSaving || !activeRecipient}>
				<Save aria-hidden="true" className="size-4" />
				{signatureButtonLabel(isSaving, activeRecipient)}
			</Button>
			{isSaveError ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Placement failed</AlertTitle>
					<AlertDescription>Unable to place signature</AlertDescription>
				</Alert>
			) : null}
			{isDeleteError ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>Unable to clear placement</AlertTitle>
					<AlertDescription>Try clearing it again.</AlertDescription>
				</Alert>
			) : null}
		</form>
	);
}

function RecipientPlacementList({
	recipients,
	activeRecipientId,
	signatureRecipientIds,
	onSelect,
}: {
	recipients: FieldEditorRecipient[];
	activeRecipientId: string | null;
	signatureRecipientIds: Set<string>;
	onSelect: (recipientId: string) => void;
}) {
	return (
		<div className="space-y-2">
			<div>
				<h3 className="font-medium text-sm">Signers</h3>
				<p className="text-muted-foreground text-pretty text-sm">
					Each signer needs at least one signature. You can place more on other pages.
				</p>
			</div>
			<div className="space-y-2">
				{recipients.map((recipient, index) => {
					const isPlaced = signatureRecipientIds.has(recipient.id);
					const isActive = recipient.id === activeRecipientId;
					return (
						<button
							key={recipient.id}
							type="button"
							aria-label={`${recipient.name} signature status`}
							onClick={() => onSelect(recipient.id)}
							className={cn(
								"flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left transition-colors",
								"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
								!isPlaced && "hover:bg-muted/40",
								isActive && "border-primary bg-muted/40",
								isPlaced && "cursor-default bg-muted/30",
							)}
						>
							<span className={cn("mt-0.5", recipientAccentText(index))}>
								{isPlaced ? (
									<CheckCircle2 aria-hidden="true" className="size-5" />
								) : (
									<Circle aria-hidden="true" className="size-5" />
								)}
							</span>
							<span className="min-w-0">
								<span className="block truncate font-medium text-sm">{recipient.name}</span>
								<span className="block truncate text-muted-foreground text-xs">
									{recipient.email}
								</span>
								<span className="mt-1 block text-xs">
									{isPlaced ? "Placed" : "Needs placement"}
								</span>
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function FieldOverlay({
	field,
	recipientName,
	colorIndex,
	isCurrent,
	onPointerDown,
	onMouseDown,
}: {
	field: PlacedField;
	recipientName: string;
	colorIndex: number;
	isCurrent: boolean;
	onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
	onMouseDown?: (event: MouseEvent<HTMLElement>) => void;
}) {
	const isCompact = field.height < 40;
	const palette = recipientOverlayPalette(colorIndex);
	const className = cn(
		"absolute z-10 flex justify-center overflow-hidden rounded border-2 px-1 tabular-nums",
		palette,
		isCurrent && "cursor-move ring-2 ring-slate-950/20",
		isCompact ? "items-center text-[9px]" : "flex-col text-[10px] leading-tight",
	);
	const style = {
		left: `${(field.x / pdfPage.width) * 100}%`,
		top: `${(field.y / pdfPage.height) * 100}%`,
		width: `${(field.width / pdfPage.width) * 100}%`,
		height: `${(field.height / pdfPage.height) * 100}%`,
	};
	const content = isCompact ? (
		<span className="truncate font-medium">
			{field.type} · {recipientName}
		</span>
	) : (
		<>
			<span className="truncate font-medium capitalize">{field.type}</span>
			<span className="truncate">{recipientName}</span>
		</>
	);
	if (isCurrent) {
		return (
			<button
				aria-label="Current signature placeholder"
				type="button"
				className={className}
				style={style}
				onPointerDown={onPointerDown}
				onMouseDown={onMouseDown}
			>
				{content}
			</button>
		);
	}
	return (
		<div
			aria-label={`${recipientName} ${field.type} placeholder`}
			role="img"
			className={className}
			style={style}
		>
			{content}
		</div>
	);
}

export function buildNextSignatureField(
	values: PlacedField,
	recipients: FieldEditorRecipient[],
	signatureRecipientIds: Set<string>,
	placedFields: EnvelopeFieldResponse[] = [],
): PlacedField | null {
	const activeRecipient = getActiveRecipient(recipients, signatureRecipientIds, values.recipientId);
	if (!activeRecipient) return null;
	return moveFromOccupiedCoordinates(
		{
			...values,
			recipientId: activeRecipient.id,
			type: "signature",
			width: signatureDimensions.width,
			height: signatureDimensions.height,
		},
		placedFields,
	);
}

function moveFromOccupiedCoordinates(
	field: PlacedField,
	placedFields: EnvelopeFieldResponse[],
): PlacedField {
	const occupiedCoordinates = new Set(
		placedFields
			.filter((placedField) => placedField.page === field.page)
			.map((placedField) => `${placedField.x}:${placedField.y}`),
	);
	if (!occupiedCoordinates.has(`${field.x}:${field.y}`)) return field;

	const gap = 24;
	let nextY = field.y + field.height + gap;
	while (nextY <= pdfPage.height - field.height) {
		if (!occupiedCoordinates.has(`${field.x}:${nextY}`)) {
			return {
				...field,
				y: nextY,
			};
		}
		nextY += field.height + gap;
	}

	let nextX = field.x + field.width + gap;
	while (nextX <= pdfPage.width - field.width) {
		if (!occupiedCoordinates.has(`${nextX}:${field.y}`)) {
			return {
				...field,
				x: nextX,
			};
		}
		nextX += field.width + gap;
	}

	const previousY = field.y - field.height - gap;
	if (previousY >= 0 && !occupiedCoordinates.has(`${field.x}:${previousY}`)) {
		return {
			...field,
			y: previousY,
		};
	}

	return {
		...field,
		y: Math.max(0, field.y - field.height - gap),
	};
}

function getActiveRecipient(
	recipients: FieldEditorRecipient[],
	_signatureRecipientIds: Set<string>,
	preferredRecipientId: string,
): FieldEditorRecipient | null {
	return (
		recipients.find((recipient) => recipient.id === preferredRecipientId) ?? recipients[0] ?? null
	);
}

function signatureButtonLabel(
	isSaving: boolean,
	activeRecipient: FieldEditorRecipient | null,
): string {
	if (isSaving) return "Saving…";
	return activeRecipient ? `Place ${activeRecipient.name} signature` : "All signatures placed";
}

function recipientOverlayPalette(index: number): string {
	const palettes = [
		"border-blue-600 bg-blue-50 text-blue-950",
		"border-emerald-600 bg-emerald-50 text-emerald-950",
		"border-amber-600 bg-amber-50 text-amber-950",
		"border-rose-600 bg-rose-50 text-rose-950",
	];
	return palettes[index % palettes.length];
}

function recipientAccentText(index: number): string {
	const colors = ["text-blue-600", "text-emerald-600", "text-amber-600", "text-rose-600"];
	return colors[index % colors.length];
}
