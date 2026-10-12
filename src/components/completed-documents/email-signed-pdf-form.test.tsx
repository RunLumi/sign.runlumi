// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmailSignedPdfForm } from "./email-signed-pdf-form";

const completedDocumentTestKey = "90000000-0000-4000-8000-000000000001";

describe("EmailSignedPdfForm", () => {
	it("sends the PDF backup to the requested address and confirms the result", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ data: { sent: true } }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		renderWithQueryClient(<EmailSignedPdfForm token={completedDocumentTestKey} byteSize={1024} />);
		fireEvent.change(screen.getByLabelText("Send to"), {
			target: { value: "backup@example.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Email signed PDF" }));

		await screen.findByText("Signed PDF sent");
		expect(fetchMock).toHaveBeenCalledWith(
			`/api/final-documents/${completedDocumentTestKey}/email`,
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ email: "backup@example.com" }),
			}),
		);
	});

	it("keeps download available and disables email for a PDF over the attachment limit", () => {
		renderWithQueryClient(
			<EmailSignedPdfForm token={completedDocumentTestKey} byteSize={4 * 1024 * 1024} />,
		);

		expect(screen.getByText("This PDF is too large to attach")).toBeTruthy();
		expect(screen.queryByLabelText("Send to")).toBeNull();
		expect(screen.queryByRole("button", { name: "Email signed PDF" })).toBeNull();
	});

	it("shows a recoverable error when email delivery fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						error: {
							message: "The email could not be sent. You can still download the signed PDF.",
						},
					}),
					{ status: 502 },
				),
			),
		);
		renderWithQueryClient(<EmailSignedPdfForm token={completedDocumentTestKey} byteSize={1024} />);
		fireEvent.change(screen.getByLabelText("Send to"), {
			target: { value: "backup@example.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Email signed PDF" }));

		await screen.findByText("The email could not be sent. You can still download the signed PDF.");
		expect(screen.getByRole("button", { name: "Email signed PDF" })).toBeTruthy();
	});
});

function renderWithQueryClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
