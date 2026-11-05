/** The longest side an SVG is rasterised to: vectors have no pixels of their own to copy. */
const SVG_RASTER_SIDE = 2048;
const SAMPLE_SIDE = 64;

export type Tone = "light" | "dark" | "any";

export type PreparedImage = {
  url: string;
  /** What goes on the clipboard: PNG is the one image type every browser can write. */
  png: Blob;
  tone: Tone;
  width: number;
  height: number;
};

function draw(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No canvas");
  context.drawImage(image, 0, 0, width, height);
  return { canvas, context };
}

/** Which paper shows this image: a light mark gets a dark tile, a dark mark a light one. */
function previewTone(image: HTMLImageElement): Tone {
  const { context } = draw(image, SAMPLE_SIDE, SAMPLE_SIDE);
  const { data } = context.getImageData(0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
  let weight = 0;
  let luminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    weight += alpha;
    luminance += alpha * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  }
  const coverage = weight / SAMPLE_SIDE ** 2;
  if (coverage > 0.98 || weight === 0) return "any"; // opaque: it brings its own paper
  return luminance / weight > 128 ? "dark" : "light";
}

/** Everything a card needs ready before the click, so a copy never waits on the network. */
export async function prepareImage(blob: Blob): Promise<PreparedImage> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const isSvg = blob.type === "image/svg+xml";
    let width = image.naturalWidth || SVG_RASTER_SIDE;
    let height = image.naturalHeight || SVG_RASTER_SIDE;
    if (isSvg) {
      const scale = SVG_RASTER_SIDE / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const png =
      blob.type === "image/png"
        ? blob
        : await new Promise<Blob>((resolve, reject) =>
            draw(image, width, height).canvas.toBlob(
              (result) => (result ? resolve(result) : reject(new Error("No PNG"))),
              "image/png",
            ),
          );

    return { url, png, tone: previewTone(image), width, height };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Throws when the browser refuses, including on any http:// host but localhost. */
export async function copyImage(png: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Clipboard images are not available here");
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

export function saveFile(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}
