import { unzlibSync } from "fflate";
import { z } from "zod";

export const SignatureImageSchema = z
	.string()
	.max(350_000)
	.refine(isSignatureImage, "Upload a valid PNG signature up to 256 KB and 1024 pixels per side");

function isSignatureImage(value: string): boolean {
	if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
	try {
		const bytes = Uint8Array.from(atob(value.split(",")[1]), (character) =>
			character.charCodeAt(0),
		);
		if (bytes.length > 256 * 1024 || bytes.length < 33) return false;
		if ([137, 80, 78, 71, 13, 10, 26, 10].some((byte, index) => bytes[index] !== byte))
			return false;
		const view = new DataView(bytes.buffer);
		const width = view.getUint32(16);
		const height = view.getUint32(20);
		if (!width || !height || width > 1024 || height > 1024) return false;
		const channels = new Map([
			[0, 1],
			[2, 3],
			[3, 1],
			[4, 2],
			[6, 4],
		]).get(bytes[25]);
		if (!channels || bytes[24] !== 8 || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] !== 0)
			return false;
		const compressed = imageChunks(bytes);
		if (!compressed) return false;
		const expected = height * (width * channels + 1);
		return unzlibSync(compressed, { out: new Uint8Array(expected + 1) }).length === expected;
	} catch {
		return false;
	}
}

function imageChunks(bytes: Uint8Array): Uint8Array | null {
	const view = new DataView(bytes.buffer);
	const compressed: Uint8Array[] = [];
	let offset = 8;
	let ended = false;
	while (offset + 12 <= bytes.length) {
		const length = view.getUint32(offset);
		if (offset + length + 12 > bytes.length) return null;
		const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
		if (offset === 8 && (type !== "IHDR" || length !== 13)) return null;
		if (type === "IDAT") compressed.push(bytes.slice(offset + 8, offset + 8 + length));
		offset += length + 12;
		if (type === "IEND") {
			ended = length === 0 && offset === bytes.length;
			break;
		}
	}
	if (!ended || compressed.length === 0) return null;
	const data = new Uint8Array(compressed.reduce((size, chunk) => size + chunk.length, 0));
	let position = 0;
	for (const chunk of compressed) {
		data.set(chunk, position);
		position += chunk.length;
	}
	return data;
}
