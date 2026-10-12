import { type PointerEvent, useRef, useState } from "react";

type Point = { x: number; y: number };

export function useSignatureDrawing(initialPath: string) {
	const [strokes, setStrokes] = useState<Point[][]>([]);
	const [savedPath, setSavedPath] = useState(initialPath);
	const activePointer = useRef<number | null>(null);
	function startDrawing(event: PointerEvent<SVGSVGElement>) {
		if (activePointer.current !== null || event.button > 0) return;
		activePointer.current = event.pointerId;
		event.currentTarget.setPointerCapture?.(event.pointerId);
		const point = pointFromEvent(event);
		setStrokes((previous) => [...previous, [point]]);
	}
	function continueDrawing(event: PointerEvent<SVGSVGElement>) {
		if (activePointer.current === null || activePointer.current !== event.pointerId) return;
		const point = pointFromEvent(event);
		setStrokes((previous) =>
			previous.map((stroke, index) =>
				index === previous.length - 1 ? [...stroke, point] : stroke,
			),
		);
	}
	function stopDrawing() {
		activePointer.current = null;
	}
	function clearDrawing() {
		activePointer.current = null;
		setStrokes([]);
		setSavedPath("");
	}
	const drawnPath = [
		savedPath,
		...strokes.map((points) =>
			points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" "),
		),
	]
		.filter(Boolean)
		.join(" ");
	return { drawnPath, startDrawing, continueDrawing, stopDrawing, clearDrawing };
}

function pointFromEvent(event: PointerEvent<SVGSVGElement>): Point {
	const bounds = event.currentTarget.getBoundingClientRect();
	const x = event.clientX - bounds.left;
	const y = event.clientY - bounds.top;
	return {
		x: Math.max(0, Math.min(320, Math.round(bounds.width > 0 ? (x / bounds.width) * 320 : x))),
		y: Math.max(0, Math.min(128, Math.round(bounds.height > 0 ? (y / bounds.height) * 128 : y))),
	};
}
