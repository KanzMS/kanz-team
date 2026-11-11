export type Format = "916" | "sq";
export type Theme = "weekly" | "urgent";

export type WorkshopState = {
  chip: string;
  kicker: string;
  title: string;
  /** Indexes of the title's words drawn in the highlight colour. */
  hl: number[];
  name: string;
  role: string;
  day: string;
  date: string;
  tHead: string;
  theme: Theme;
  cta: string;
  /** [country, time] */
  rows: [string, string][];
  pScale: number;
  pX: number;
  /** The day and date tag's size, in percent. */
  tagScale: number;
};

export const DUR: number;
export const FPS: number;
export const DEFAULTS: WorkshopState;
export const LAY: Record<Format, { W: number; H: number }>;

export function drawFrame(
  context: CanvasRenderingContext2D,
  format: Format,
  time: number,
  state: WorkshopState,
  images: { person: HTMLImageElement; logo: HTMLImageElement },
): void;
