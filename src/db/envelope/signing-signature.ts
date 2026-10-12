import type { CompleteSigningRequest, CompleteSigningSignature } from "./schema";

export type NormalizedSigningSignature =
	| { kind: "uploaded"; fieldValue: string; auditMessage: string; label: string; imageData: string }
	| {
			kind: "typed";
			fieldValue: string;
			auditMessage: string;
			typedText: string;
			typedFont: string;
	  }
	| {
			kind: "drawn";
			fieldValue: string;
			auditMessage: string;
			label: string;
			svgPath: string;
	  };

export function normalizeSigningSignature(
	input: CompleteSigningRequest,
): NormalizedSigningSignature {
	const signature = input.signature ?? legacyTypedSigningSignature(input.signatureName);
	if (signature.kind === "typed") {
		return {
			kind: "typed",
			fieldValue: signature.typedText,
			auditMessage: signature.typedText,
			typedText: signature.typedText,
			typedFont: signature.typedFont,
		};
	}
	if (signature.kind === "uploaded")
		return { ...signature, fieldValue: signature.imageData, auditMessage: signature.label };
	return {
		kind: "drawn",
		fieldValue: signature.svgPath,
		auditMessage: signature.label,
		label: signature.label,
		svgPath: signature.svgPath,
	};
}

function legacyTypedSigningSignature(signatureName: string | undefined): CompleteSigningSignature {
	const typedText = signatureName?.trim();
	if (!typedText) throw new Error("Signature is required");
	return {
		kind: "typed",
		typedText,
		typedFont: "cursive",
	};
}
