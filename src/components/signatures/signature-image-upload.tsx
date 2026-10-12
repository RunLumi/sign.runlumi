import { useRef, useState } from "react";

export function SignatureImageUpload({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const [error, setError] = useState("");
	const sequence = useRef(0);
	async function upload(file: File | undefined) {
		const request = ++sequence.current;
		setError("");
		onChange("");
		if (!file) return;
		if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2 * 1024 * 1024) {
			setError("Choose a PNG or JPEG image up to 2 MB.");
			return;
		}
		try {
			const normalized = await normalizeImage(file);
			if (request === sequence.current) onChange(normalized);
		} catch {
			if (request === sequence.current)
				setError("Unable to use this image. Try a smaller, cropped PNG or JPEG of your signature.");
		}
	}
	return (
		<div className="space-y-3">
			<label className="block space-y-2 text-sm">
				<span className="font-medium">Upload signature image</span>
				<input
					type="file"
					accept="image/png,image/jpeg"
					onChange={(event) => {
						void upload(event.target.files?.[0]);
						event.target.value = "";
					}}
					className="block w-full rounded-lg border p-3"
				/>
			</label>
			<p className="text-muted-foreground text-sm">
				PNG or JPEG, up to 2 MB. Crop closely around your signature; transparent PNG works best.
			</p>
			{value ? (
				<div className="flex h-48 items-center justify-center rounded-lg border bg-white p-4">
					<img
						src={value}
						alt="Uploaded signature preview"
						className="max-h-full max-w-full object-contain"
					/>
				</div>
			) : null}
			{error ? (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			) : null}
		</div>
	);
}

async function normalizeImage(file: File): Promise<string> {
	const image = await createImageBitmap(file);
	try {
		if (image.width > 8192 || image.height > 8192) throw new Error("Image is too large");
		const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(image.width * scale));
		canvas.height = Math.max(1, Math.round(image.height * scale));
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Image processing unavailable");
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		const normalized = canvas.toDataURL("image/png");
		if (normalized.length > 349_000) throw new Error("Image is too detailed");
		return normalized;
	} finally {
		image.close();
	}
}
