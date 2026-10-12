// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SignatureImageUpload } from "./signature-image-upload";

const png =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=";

describe("SignatureImageUpload", () => {
	it("normalizes a selected JPEG and publishes previewable PNG content", async () => {
		const close = vi.fn();
		vi.stubGlobal(
			"createImageBitmap",
			vi.fn().mockResolvedValue({ width: 1600, height: 400, close }),
		);
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
			() => ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D,
		);
		vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(png);
		const onChange = vi.fn();
		render(<SignatureImageUpload value="" onChange={onChange} />);
		fireEvent.change(screen.getByLabelText("Upload signature image"), {
			target: { files: [new File(["fixture"], "signature.jpg", { type: "image/jpeg" })] },
		});
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(png));
		expect(close).toHaveBeenCalled();
	});
	it("rejects unsupported uploads before decoding", async () => {
		const decode = vi.fn();
		vi.stubGlobal("createImageBitmap", decode);
		render(<SignatureImageUpload value="" onChange={vi.fn()} />);
		fireEvent.change(screen.getByLabelText("Upload signature image"), {
			target: { files: [new File(["<svg/>"], "signature.svg", { type: "image/svg+xml" })] },
		});
		expect(await screen.findByRole("alert")).toHaveProperty(
			"textContent",
			"Choose a PNG or JPEG image up to 2 MB.",
		);
		expect(decode).not.toHaveBeenCalled();
	});
});
