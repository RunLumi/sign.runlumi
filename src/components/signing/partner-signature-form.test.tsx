// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	type CompleteSigningPayload,
	PartnerSignatureForm,
	type PartnerSignaturePreference,
} from "./partner-signature-form";

beforeAll(() => {
	vi.stubGlobal("PointerEvent", MouseEvent);
});

describe("PartnerSignatureForm", () => {
	it("previews and submits a saved uploaded signature with explicit reuse consent", async () => {
		const imageData =
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=";
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<PartnerSignatureForm
				initialPreference={{
					id: "uploaded",
					kind: "uploaded",
					label: "Uploaded signature",
					imageData,
					svgPath: null,
					typedText: null,
					typedFont: null,
				}}
				disabled={false}
				onSubmit={onSubmit}
			/>,
		);
		expect(screen.getByAltText("Uploaded signature preview").getAttribute("src")).toBe(imageData);
		fireEvent.click(screen.getByRole("button", { name: "Complete signing" }));
		await waitFor(() =>
			expect(onSubmit).toHaveBeenCalledWith({
				signature: { kind: "uploaded", label: "Uploaded signature", imageData },
				rememberSignature: true,
			}),
		);
	});

	it("prefills a saved typed signature and keeps future updates selected", async () => {
		const submissions: CompleteSigningPayload[] = [];

		render(
			<PartnerSignatureForm
				initialPreference={savedTypedPreference}
				disabled={false}
				onSubmit={async (payload) => {
					submissions.push(payload);
				}}
			/>,
		);

		expect(screen.getByLabelText("Typed signature text")).toHaveProperty("value", "Ada Saved");
		expect(screen.getByLabelText("Signature font")).toHaveProperty("value", "serif");
		expect(screen.getByLabelText("Remember signature for future envelopes")).toHaveProperty(
			"checked",
			true,
		);

		fireEvent.change(screen.getByLabelText("Typed signature text"), {
			target: { value: "Ada Updated" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Complete signing" }));

		await waitFor(() => expect(submissions).toHaveLength(1));
		expect(submissions[0]).toEqual({
			signature: {
				kind: "typed",
				typedText: "Ada Updated",
				typedFont: "serif",
			},
			rememberSignature: true,
		});
	});

	it("prefills a saved drawn signature path and submits it as the preferred mode", async () => {
		const submissions: CompleteSigningPayload[] = [];

		render(
			<PartnerSignatureForm
				initialPreference={savedDrawnPreference}
				disabled={false}
				onSubmit={async (payload) => {
					submissions.push(payload);
				}}
			/>,
		);

		expect(screen.getByRole("button", { name: "Choose drawn signature" })).toHaveProperty(
			"ariaPressed",
			"true",
		);
		expect(
			screen.getByLabelText("Draw signature pad").querySelector("path")?.getAttribute("d"),
		).toBe("M 12 36 L 48 20 L 96 42");
		expect(screen.getByLabelText("Remember signature for future envelopes")).toHaveProperty(
			"checked",
			true,
		);

		fireEvent.click(screen.getByRole("button", { name: "Complete signing" }));

		await waitFor(() => expect(submissions).toHaveLength(1));
		expect(submissions[0]).toEqual({
			signature: {
				kind: "drawn",
				label: "Drawn signature",
				svgPath: "M 12 36 L 48 20 L 96 42",
			},
			rememberSignature: true,
		});
	});

	it("captures a drawn signature stroke and submits its SVG path", async () => {
		const submissions: CompleteSigningPayload[] = [];

		render(
			<PartnerSignatureForm
				initialPreference={null}
				disabled={false}
				onSubmit={async (payload) => {
					submissions.push(payload);
				}}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Choose drawn signature" }));
		const signaturePad = screen.getByLabelText("Draw signature pad");
		Object.defineProperty(signaturePad, "getBoundingClientRect", {
			configurable: true,
			value: () => ({
				bottom: 128,
				height: 128,
				left: 0,
				right: 320,
				top: 0,
				width: 320,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			}),
		});

		fireEvent.pointerDown(signaturePad, { clientX: 12, clientY: 36 });
		fireEvent.pointerMove(signaturePad, { clientX: 48, clientY: 20 });
		fireEvent.pointerUp(signaturePad);
		fireEvent.click(screen.getByRole("button", { name: "Complete signing" }));

		await waitFor(() => expect(submissions).toHaveLength(1));
		expect(submissions[0]).toEqual({
			signature: {
				kind: "drawn",
				label: "Drawn signature",
				svgPath: "M 12 36 L 48 20",
			},
			rememberSignature: false,
		});
	});
});

const savedTypedPreference: PartnerSignaturePreference = {
	id: "60000000-0000-4000-8000-000000000001",
	kind: "typed",
	label: "Saved typed",
	svgPath: null,
	typedText: "Ada Saved",
	typedFont: "serif",
};

const savedDrawnPreference: PartnerSignaturePreference = {
	id: "60000000-0000-4000-8000-000000000002",
	kind: "drawn",
	label: "Saved drawn",
	svgPath: "M 12 36 L 48 20 L 96 42",
	typedText: null,
	typedFont: null,
};
