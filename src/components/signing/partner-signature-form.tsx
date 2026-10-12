import {
	IconCheck as Check,
	IconWritingSign as PenLine,
	IconRotate2 as RotateCcw,
	IconTypography as Type,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { useState } from "react";
import { NativeSelect } from "@/components/patterns/native-select";
import { Panel } from "@/components/patterns/panel";
import { SignatureImageUpload } from "@/components/signatures/signature-image-upload";
import { useSignatureDrawing } from "@/components/signatures/use-signature-drawing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SignatureMode = "typed" | "drawn" | "uploaded";
type TypedSignatureFont = "cursive" | "serif" | "sans-serif";

export type PartnerSignaturePreference = {
	id: string;
	kind: SignatureMode;
	label: string;
	svgPath: string | null;
	imageData?: string | null;
	typedText: string | null;
	typedFont: string | null;
};

export type CompleteSigningPayload =
	| {
			signature: { kind: "uploaded"; label: string; imageData: string };
			rememberSignature: boolean;
	  }
	| {
			signature: {
				kind: "typed";
				typedText: string;
				typedFont: TypedSignatureFont;
			};
			rememberSignature: boolean;
	  }
	| {
			signature: {
				kind: "drawn";
				label: string;
				svgPath: string;
			};
			rememberSignature: boolean;
	  };

type SignatureFormValues = {
	mode: SignatureMode;
	typedText: string;
	typedFont: TypedSignatureFont;
	rememberSignature: boolean;
};

const typedSignatureFonts: Array<{ label: string; value: TypedSignatureFont; stack: string }> = [
	{
		label: "Script",
		value: "cursive",
		stack: "'Savoye LET', 'Snell Roundhand', 'Segoe Script', cursive",
	},
	{ label: "Serif", value: "serif", stack: "'Iowan Old Style', Palatino, Georgia, serif" },
	{
		label: "Clean",
		value: "sans-serif",
		stack: "'InterVariable', 'Helvetica Neue', Arial, sans-serif",
	},
];

export function PartnerSignatureForm({
	initialPreference,
	disabled,
	onSubmit,
}: {
	initialPreference: PartnerSignaturePreference | null;
	disabled: boolean;
	onSubmit: (payload: CompleteSigningPayload) => Promise<void>;
}) {
	const [imageData, setImageData] = useState(
		initialPreference?.kind === "uploaded" ? (initialPreference.imageData ?? "") : "",
	);
	const { drawnPath, startDrawing, continueDrawing, stopDrawing, clearDrawing } =
		useSignatureDrawing(
			initialPreference?.kind === "drawn" ? (initialPreference.svgPath ?? "") : "",
		);
	const [validationError, setValidationError] = useState<string | null>(null);
	const form = useForm({
		defaultValues: signatureFormDefaults(initialPreference),
		onSubmit: async ({ value }) => {
			const payload = buildCompleteSigningPayload(value, drawnPath, imageData);
			if (!payload.ok) {
				setValidationError(payload.message);
				return;
			}
			setValidationError(null);
			await onSubmit(payload.value);
		},
	});

	return (
		<Panel
			as="form"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-5"
		>
			<form.Subscribe selector={(state) => state.values}>
				{(values) => {
					const fontStack =
						typedSignatureFonts.find((font) => font.value === values.typedFont)?.stack ??
						typedSignatureFonts[0].stack;
					return (
						<>
							<fieldset className="grid gap-3 sm:grid-cols-3">
								<legend className="sr-only">Signature method</legend>
								<SignatureMethodButton
									isActive={values.mode === "typed"}
									icon={<Type className="size-4" />}
									title="Typed"
									description="Render your name in a selected font."
									onClick={() => {
										form.setFieldValue("mode", "typed");
										setValidationError(null);
									}}
								/>
								<SignatureMethodButton
									isActive={values.mode === "drawn"}
									icon={<PenLine className="size-4" />}
									title="Drawn"
									description="Use a hand-drawn stroke for this signature."
									onClick={() => {
										form.setFieldValue("mode", "drawn");
										setValidationError(null);
									}}
								/>
								<SignatureMethodButton
									isActive={values.mode === "uploaded"}
									icon={<PenLine aria-hidden="true" className="size-4" />}
									title="Uploaded"
									description="Use an image of your signature."
									onClick={() => {
										form.setFieldValue("mode", "uploaded");
										setValidationError(null);
									}}
								/>
							</fieldset>

							{values.mode === "typed" ? (
								<div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
									<div
										aria-label="Typed signature preview"
										role="img"
										className="flex h-32 items-center justify-center rounded-lg border bg-background px-4 text-pretty text-3xl"
										style={{ fontFamily: fontStack }}
									>
										{values.typedText || "Typed name"}
									</div>
									<div className="grid gap-4">
										<form.Field name="typedText">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor="partner-typed-signature-text">Typed signature text</Label>
													<Input
														id="partner-typed-signature-text"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(event) => field.handleChange(event.target.value)}
														required={values.mode === "typed"}
													/>
												</div>
											)}
										</form.Field>
										<form.Field name="typedFont">
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor="partner-signature-font">Signature font</Label>
													<NativeSelect
														id="partner-signature-font"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(event) =>
															field.handleChange(event.target.value as TypedSignatureFont)
														}
													>
														{typedSignatureFonts.map((font) => (
															<option key={font.value} value={font.value}>
																{font.label}
															</option>
														))}
													</NativeSelect>
												</div>
											)}
										</form.Field>
									</div>
								</div>
							) : values.mode === "uploaded" ? (
								<SignatureImageUpload value={imageData} onChange={setImageData} />
							) : (
								<div className="space-y-3">
									<svg
										aria-label="Draw signature pad"
										role="img"
										viewBox="0 0 320 128"
										className="h-60 w-full touch-none select-none rounded-lg border bg-background sm:h-72"
										preserveAspectRatio="none"
										onPointerDown={startDrawing}
										onPointerMove={continueDrawing}
										onPointerUp={stopDrawing}
										onPointerCancel={stopDrawing}
										onLostPointerCapture={stopDrawing}
									>
										<path
											d={drawnPath}
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="3"
											className="text-foreground"
										/>
									</svg>
									<Button type="button" variant="outline" onClick={clearDrawing}>
										<RotateCcw className="size-4" />
										Clear drawing
									</Button>
								</div>
							)}

							<div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
								<form.Field name="rememberSignature">
									{(field) => (
										<label className="flex min-h-9 items-center gap-2 text-sm">
											<input
												type="checkbox"
												checked={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.checked)}
												className="size-4 rounded border-input"
											/>
											<span>Remember signature for future envelopes</span>
										</label>
									)}
								</form.Field>
								<Button type="submit" disabled={disabled}>
									<Check className="size-4" />
									Complete signing
								</Button>
							</div>
						</>
					);
				}}
			</form.Subscribe>

			{validationError ? <p className="text-destructive text-sm">{validationError}</p> : null}
		</Panel>
	);
}

function SignatureMethodButton({
	isActive,
	icon,
	title,
	description,
	onClick,
}: {
	isActive: boolean;
	icon: ReactNode;
	title: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={isActive}
			aria-label={`Choose ${title.toLowerCase()} signature`}
			onClick={onClick}
			className={cn(
				"flex min-h-24 items-start gap-3 rounded-lg border bg-background p-4 text-left transition-colors",
				"hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
				isActive && "border-primary bg-muted/40",
			)}
		>
			<span className="mt-0.5 text-muted-foreground">{icon}</span>
			<span>
				<span className="block font-medium text-sm">{title}</span>
				<span className="mt-1 block text-muted-foreground text-pretty text-sm">{description}</span>
			</span>
		</button>
	);
}

function signatureFormDefaults(preference: PartnerSignaturePreference | null): SignatureFormValues {
	if (preference?.kind === "uploaded")
		return { mode: "uploaded", rememberSignature: true, typedText: "", typedFont: "cursive" };
	if (preference?.kind === "typed") {
		return {
			mode: "typed",
			typedText: preference.typedText ?? "",
			typedFont: parseTypedFont(preference.typedFont),
			rememberSignature: true,
		};
	}
	if (preference?.kind === "drawn") {
		return {
			mode: "drawn",
			typedText: "",
			typedFont: "cursive",
			rememberSignature: true,
		};
	}
	return {
		mode: "typed",
		typedText: "",
		typedFont: "cursive",
		rememberSignature: false,
	};
}

function buildCompleteSigningPayload(
	values: SignatureFormValues,
	drawnPath: string,
	imageData: string,
): { ok: true; value: CompleteSigningPayload } | { ok: false; message: string } {
	if (values.mode === "uploaded") {
		if (!imageData) return { ok: false, message: "Upload a signature before completing." };
		return {
			ok: true,
			value: {
				signature: { kind: "uploaded", label: "Uploaded signature", imageData },
				rememberSignature: values.rememberSignature,
			},
		};
	}
	if (values.mode === "typed") {
		const typedText = values.typedText.trim();
		if (!typedText) return { ok: false, message: "Type a signature before completing." };
		return {
			ok: true,
			value: {
				signature: {
					kind: "typed",
					typedText,
					typedFont: values.typedFont,
				},
				rememberSignature: values.rememberSignature,
			},
		};
	}
	if (!drawnPath) return { ok: false, message: "Draw a signature before completing." };
	return {
		ok: true,
		value: {
			signature: {
				kind: "drawn",
				label: "Drawn signature",
				svgPath: drawnPath,
			},
			rememberSignature: values.rememberSignature,
		},
	};
}

function parseTypedFont(value: string | null): TypedSignatureFont {
	return typedSignatureFonts.some((font) => font.value === value)
		? (value as TypedSignatureFont)
		: "cursive";
}
