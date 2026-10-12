import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { maxFinalDocumentEmailAttachmentBytes } from "@/lib/document-email-limits";

interface EmailSignedPdfFormProps {
	token: string;
	byteSize: number;
}

export function EmailSignedPdfForm({ token, byteSize }: EmailSignedPdfFormProps) {
	const mutation = useMutation({
		mutationFn: (email: string) => sendSignedPdf(token, email),
	});
	const form = useForm({
		defaultValues: { email: "" },
		onSubmit: ({ value }) => mutation.mutate(value.email.trim()),
	});

	return (
		<section aria-labelledby="email-signed-pdf-heading" className="space-y-3 border-b pb-6">
			<div className="space-y-1">
				<h2 id="email-signed-pdf-heading" className="font-semibold text-xl">
					Email a backup copy
				</h2>
				<p className="text-muted-foreground text-sm">
					Send the signed PDF as an attachment to an email address you choose.
				</p>
			</div>
			{byteSize > maxFinalDocumentEmailAttachmentBytes ? (
				<Alert>
					<AlertTitle>This PDF is too large to attach</AlertTitle>
					<AlertDescription>Download the signed PDF above to save or share it.</AlertDescription>
				</Alert>
			) : (
				<form
					className="flex flex-col gap-3 sm:flex-row sm:items-end"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.Field name="email">
						{(field) => (
							<div className="min-w-0 flex-1 space-y-1">
								<label htmlFor="signed-pdf-email" className="font-medium text-sm">
									Send to
								</label>
								<input
									id="signed-pdf-email"
									type="email"
									autoComplete="email"
									maxLength={254}
									required
									placeholder="name@example.com"
									value={field.state.value}
									onChange={(event) => {
										mutation.reset();
										field.handleChange(event.target.value);
									}}
									className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
								/>
							</div>
						)}
					</form.Field>
					<Button type="submit" disabled={mutation.isPending}>
						<Mail aria-hidden="true" className="size-4" />
						{mutation.isPending ? "Sending…" : "Email signed PDF"}
					</Button>
				</form>
			)}
			{mutation.isError ? (
				<Alert variant="destructive" role="alert">
					<AlertTitle>{mutation.error.message}</AlertTitle>
					<AlertDescription>You can still download the signed PDF above.</AlertDescription>
				</Alert>
			) : null}
			{mutation.isSuccess ? (
				<Alert role="status">
					<AlertTitle>Signed PDF sent</AlertTitle>
					<AlertDescription>A copy was sent to {mutation.variables}.</AlertDescription>
				</Alert>
			) : null}
		</section>
	);
}

async function sendSignedPdf(token: string, email: string): Promise<void> {
	const response = await fetch(`/api/final-documents/${token}/email`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email }),
	});
	const body = (await response.json().catch(() => null)) as {
		error?: { message?: string };
	} | null;
	if (!response.ok) throw new Error(body?.error?.message ?? "The email could not be sent");
}
