import { z } from "zod";
import { SignatureImageSchema } from "./signature-image";
import { signatureProfileKinds } from "./table";
export const SignatureProfileKindSchema = z.enum(signatureProfileKinds);
export type SignatureProfileKind = z.infer<typeof SignatureProfileKindSchema>;
export const SignatureProfileSchema = z.object({
	id: z.string().uuid(),
	envelopeId: z.string().uuid(),
	createdBy: z.string().min(1),
	kind: SignatureProfileKindSchema,
	label: z.string().min(1),
	svgPath: z.string().nullable().optional(),
	imageData: z.string().nullable().optional(),
	typedText: z.string().nullable().optional(),
	typedFont: z.string().nullable().optional(),
	selected: z.boolean(),
	createdAt: z.date(),
});
export type SignatureProfile = z.infer<typeof SignatureProfileSchema>;

export const SignatureProfileCreateRequestSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("uploaded"),
		label: z.string().trim().min(1).max(120).default("Uploaded signature"),
		imageData: SignatureImageSchema,
		selected: z.boolean().default(true),
	}),
	z.object({
		kind: z.literal("drawn"),
		label: z.string().min(1).max(120),
		svgPath: z.string().min(1),
		selected: z.boolean().optional().default(true),
	}),
	z.object({
		kind: z.literal("typed"),
		label: z.string().min(1).max(120),
		typedText: z.string().min(1).max(120),
		typedFont: z.string().min(1).max(80).default("serif"),
		selected: z.boolean().optional().default(true),
	}),
]);
export type SignatureProfileCreateRequest = z.infer<typeof SignatureProfileCreateRequestSchema>;

export const SignatureProfileResponseSchema = SignatureProfileSchema.extend({
	svgPath: z.string().nullable(),
	typedText: z.string().nullable(),
	typedFont: z.string().nullable(),
	createdAt: z.string(),
});
export type SignatureProfileResponse = z.infer<typeof SignatureProfileResponseSchema>;
