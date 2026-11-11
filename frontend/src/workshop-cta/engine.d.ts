export type CtaImages = { top: HTMLImageElement; bottom: HTMLImageElement };

export const FRAMES: number;
/** The frame held for most of the 10-minute loop. */
export const HOLD: number;
export const WIDTH: number;
export const HEIGHT: number;
/** The part of the 1920x1080 frame that has anything in it. */
export const AREA: { x: number; y: number; w: number; h: number };

export function codeFontSize(context: CanvasRenderingContext2D, code: string): number;

/** Draws one frame into a canvas the size of AREA and returns its pixels. */
export function drawFrame(context: CanvasRenderingContext2D, frame: number, code: string, images: CtaImages): ImageData;

export function exportGif(code: string, images: CtaImages, onProgress: (share: number) => void): Promise<Blob>;
