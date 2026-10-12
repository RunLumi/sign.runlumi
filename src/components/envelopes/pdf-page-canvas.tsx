import { useEffect, useRef, useState } from "react";

interface PdfPage {
	getViewport(options: { scale: number }): { width: number; height: number };
	render(options: {
		canvasContext: CanvasRenderingContext2D;
		viewport: { width: number; height: number };
	}): { promise: Promise<void>; cancel(): void };
}
interface PdfDocument {
	getPage(page: number): Promise<PdfPage>;
	destroy(): Promise<void>;
}
interface PdfJs {
	GlobalWorkerOptions: { workerSrc: string };
	getDocument(options: {
		data: Uint8Array;
		isEvalSupported: boolean;
		standardFontDataUrl: string;
		cMapUrl: string;
		cMapPacked: boolean;
		wasmUrl: string;
		iccUrl: string;
	}): { promise: Promise<PdfDocument> };
}

export function PdfPageCanvas({ document, page }: { document: PdfDocument; page: number }) {
	const ref = useRef<HTMLCanvasElement>(null);
	const [error, setError] = useState(false);
	useEffect(() => {
		let cancelled = false;
		let task: ReturnType<PdfPage["render"]> | undefined;
		async function render() {
			const canvas = ref.current;
			if (!canvas) return;
			const pdfPage = await document.getPage(page);
			if (cancelled) return;
			const natural = pdfPage.getViewport({ scale: 1 });
			const viewport = pdfPage.getViewport({ scale: Math.min(2, 1200 / natural.width) });
			canvas.width = Math.ceil(viewport.width);
			canvas.height = Math.ceil(viewport.height);
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas is unavailable");
			task = pdfPage.render({ canvasContext: context, viewport });
			await task.promise;
			if (!cancelled) canvas.dataset.rendered = "true";
		}
		setError(false);
		void render().catch(() => {
			if (!cancelled) setError(true);
		});
		return () => {
			cancelled = true;
			task?.cancel();
		};
	}, [document, page]);
	return (
		<>
			<canvas
				ref={ref}
				aria-label={`Source PDF page ${page}`}
				role="img"
				className="pointer-events-none absolute inset-0 h-full w-full"
			/>
			{error ? <p role="alert">Unable to render PDF page {page}.</p> : null}
		</>
	);
}

export async function loadPlacementPdf(bytes: ArrayBuffer): Promise<PdfDocument> {
	const moduleUrl = "/vendor/pdfjs/pdf.mjs";
	const pdfjs = (await import(/* @vite-ignore */ moduleUrl)) as PdfJs;
	pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.mjs";
	return pdfjs.getDocument({
		data: new Uint8Array(bytes),
		isEvalSupported: false,
		standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
		cMapUrl: "/vendor/pdfjs/cmaps/",
		cMapPacked: true,
		wasmUrl: "/vendor/pdfjs/wasm/",
		iccUrl: "/vendor/pdfjs/iccs/",
	}).promise;
}
