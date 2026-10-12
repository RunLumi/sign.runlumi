import { CompleteSigningSignatureSchema, SignatureProfileCreateRequestSchema } from "./schema";

const png =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=";

describe("uploaded signature validation", () => {
	it("accepts bounded PNG signatures through both public request schemas", () => {
		const signature = { kind: "uploaded", label: "My signature", imageData: png };
		expect(SignatureProfileCreateRequestSchema.safeParse(signature).success).toBe(true);
		expect(CompleteSigningSignatureSchema.safeParse(signature).success).toBe(true);
	});
	it("rejects arbitrary data, SVG, oversized payloads, and oversized dimensions", () => {
		const bytes = Uint8Array.from(atob(png.split(",")[1]), (c) => c.charCodeAt(0));
		new DataView(bytes.buffer).setUint32(16, 100_000);
		const hugeDimensions = `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;
		for (const imageData of [
			"data:image/svg+xml;base64,PHN2Zz4=",
			"data:image/png;base64,aGVsbG8=",
			"x".repeat(350_001),
			hugeDimensions,
		]) {
			expect(
				CompleteSigningSignatureSchema.safeParse({ kind: "uploaded", imageData }).success,
			).toBe(false);
		}
	});
});
