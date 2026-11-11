import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../components";
import { saveFile } from "../lib/image";
import { AREA, FRAMES, HEIGHT, HOLD, WIDTH, codeFontSize, drawFrame, exportGif, type CtaImages } from "../workshop-cta/engine";
import bottomUrl from "../workshop-cta/base_bottom.png";
import topUrl from "../workshop-cta/base_top.png";

const STORAGE_KEY = "kanz-workshop-cta-code";
const DEFAULT_CODE = "WARSHA1112";
const FONT = "IBM Plex Sans Arabic";
/** StreamYard takes GIF overlays under 3 MB and under 108 frames. */
const MAX_BYTES = 3 * 1024 * 1024;
const FRAME_MS = 40;
/** The preview shortens the 10-minute hold and pauses briefly before looping. */
const PAUSE_MS: Record<number, number> = { [HOLD]: 2000, [FRAMES - 1]: 900 };
/** Close-up: the box and its tag in the top-right corner. */
const ZOOM = { x: 1120, y: 0, w: 800, h: 380 };

type View = "full" | "zoom";
type Status = { text: string; tone?: "ok" | "error" };

function cleanCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 16);
}

function loadCode(): string {
  try {
    return cleanCode(localStorage.getItem(STORAGE_KEY) ?? "") || DEFAULT_CODE;
  } catch {
    return DEFAULT_CODE;
  }
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

/** A stand-in for the live video behind the overlay. */
function drawBackdrop(context: CanvasRenderingContext2D) {
  const sky = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  sky.addColorStop(0, "#3b4452");
  sky.addColorStop(1, "#1b2028");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = context.createRadialGradient(700, 560, 40, 700, 560, 620);
  glow.addColorStop(0, "rgba(210,190,170,.35)");
  glow.addColorStop(1, "rgba(210,190,170,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);
}

function megabytes(bytes: number): string {
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export function WorkshopCtaPage() {
  const inputId = useId();
  const [code, setCode] = useState(loadCode);
  const [view, setView] = useState<View>("full");
  const [playing, setPlaying] = useState(() => !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [images, setImages] = useState<CtaImages | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scrubber = useRef<HTMLInputElement>(null);
  const frame = useRef(playing ? 0 : HOLD);
  const live = useRef({ code, view, playing, images });
  live.current = { code: code || "CODE", view, playing, images };

  // The tag's font and the frames have to be in before the first draw, or the code measures wrong.
  useEffect(() => {
    let stale = false;
    Promise.all([
      Promise.all([300, 700].map((w) => document.fonts.load(`${w} 40px "${FONT}"`, "code:WARSHA0123456789-"))).catch(() => {}),
      loadImage(topUrl),
      loadImage(bottomUrl),
    ])
      .then(([, top, bottom]) => {
        if (!stale) setImages({ top, bottom });
      })
      .catch(() => {
        if (!stale) setStatus({ text: "The overlay's frames didn't load. Reload the page.", tone: "error" });
      });
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Storage can be blocked; the code just isn't remembered.
    }
  }, [code]);

  // Draw loop: advances while playing, redraws on every change either way.
  useEffect(() => {
    const work = document.createElement("canvas");
    work.width = AREA.w;
    work.height = AREA.h;
    const workContext = work.getContext("2d", { willReadFrequently: true })!;
    let raf = 0;
    let last = 0;
    let waitUntil = 0;
    let drawn = "";

    function paint() {
      const { code, view, images } = live.current;
      const target = canvas.current;
      if (!images || !target) return;
      const context = target.getContext("2d")!;
      drawFrame(workContext, frame.current, code, images);
      const box = view === "zoom" ? ZOOM : { x: 0, y: 0, w: WIDTH, h: HEIGHT };
      context.save();
      context.translate(-box.x, -box.y);
      drawBackdrop(context);
      context.drawImage(work, AREA.x, AREA.y);
      context.restore();
      if (scrubber.current) scrubber.current.value = String(frame.current);
    }

    function tick(now: number) {
      raf = requestAnimationFrame(tick);
      const { code, view, playing, images } = live.current;
      const key = `${code}|${view}|${!!images}|${frame.current}`;
      if (playing && now >= waitUntil && now - last >= FRAME_MS) {
        last = now;
        waitUntil = now + (PAUSE_MS[frame.current] ?? 0);
        frame.current = (frame.current + 1) % FRAMES;
        paint();
      } else if (key !== drawn) {
        paint();
      }
      drawn = key;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function changeCode(value: string) {
    setCode(cleanCode(value));
    setStatus(null);
    // Jump to where the tag is on screen so the new code shows straight away.
    if (frame.current < 50 || frame.current > HOLD) frame.current = HOLD;
  }

  function scrub(value: number) {
    setPlaying(false);
    live.current = { ...live.current, playing: false };
    frame.current = value;
  }

  const shrunk = (() => {
    if (!images || !code) return false;
    const probe = document.createElement("canvas").getContext("2d")!;
    return codeFontSize(probe, code) < 40;
  })();

  async function download() {
    if (!images || !code) return;
    setBusy(true);
    setProgress(0);
    setStatus(null);
    try {
      const blob = await exportGif(code, images, setProgress);
      const url = URL.createObjectURL(blob);
      saveFile(url, `CTA thrusday ${code}.gif`);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus(
        blob.size < MAX_BYTES
          ? { text: `Downloaded CTA thrusday ${code}.gif (${megabytes(blob.size)}). Ready for StreamYard.`, tone: "ok" }
          : { text: `The GIF is ${megabytes(blob.size)}, over StreamYard's 3 MB limit.`, tone: "error" },
      );
    } catch {
      setStatus({ text: "The GIF couldn't be made. Reload the page and try again.", tone: "error" });
    }
    setBusy(false);
  }

  const box = view === "zoom" ? ZOOM : { w: WIDTH, h: HEIGHT };

  return (
    <div className="page">
      <h1 className="page-title">Workshop CTA</h1>
      <p className="page-sub">
        The promo code overlay for the workshop live stream. Type this week's code and download the GIF for StreamYard.
      </p>

      <div className="section ad-layout">
        <form className="ad-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <section className="panel form-panel" aria-label="Promo code">
            <div className="field">
              <label className="field-label" htmlFor={inputId}>
                Promo code
              </label>
              <input
                id={inputId}
                className="input mono cta-code-input"
                dir="ltr"
                spellCheck={false}
                maxLength={16}
                value={code}
                onChange={(e) => changeCode(e.target.value)}
              />
              <p className="field-hint">
                {shrunk ? "Long code: it's set a little smaller so the tag doesn't cover the text." : "Letters, numbers and hyphens. It shows on the purple tag."}
              </p>
            </div>
            <dl className="cta-facts">
              <dt>Loop</dt>
              <dd>10:00, with the box held on screen</dd>
              <dt>Frames</dt>
              <dd className="mono">{FRAMES}</dd>
              <dt>Size</dt>
              <dd className="mono">
                {WIDTH} × {HEIGHT} px, 25 fps, transparent
              </dd>
            </dl>
            <p className="field-hint">
              <Icon name="info" />
              StreamYard takes GIF overlays under 3 MB and under 108 frames.
            </p>
          </section>
        </form>

        <section className="panel ad-stage" aria-label="Preview and download">
          <div className="ad-toolbar">
            <div className="segmented" role="group" aria-label="Preview">
              {(
                [
                  ["full", "Full frame"],
                  ["zoom", "Close-up"],
                ] as const
              ).map(([value, label]) => (
                <button key={value} type="button" className="segmented-option" aria-pressed={view === value} onClick={() => setView(value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="ad-view">
            {!images && <span className="skeleton ad-canvas cta-canvas" style={{ aspectRatio: `${box.w} / ${box.h}` }} />}
            <canvas
              ref={canvas}
              className="ad-canvas cta-canvas"
              width={box.w}
              height={box.h}
              hidden={!images}
              role="img"
              aria-label="Preview of the overlay over a stand-in video"
            />
          </div>

          <div className="ad-transport">
            <button type="button" className="icon-button is-solid" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>
              <Icon name={playing ? "pause" : "play_arrow"} />
            </button>
            <input
              ref={scrubber}
              type="range"
              className="range ad-scrubber"
              aria-label="Frame in the animation"
              min={0}
              max={FRAMES - 1}
              step={1}
              defaultValue={frame.current}
              onChange={(e) => scrub(+e.target.value)}
            />
            <span className="ad-clock">10 min hold shown as 2 s</span>
          </div>

          <div className="ad-download">
            <div className="ad-download-info">
              <span className="ad-download-title">Download</span>
              <span className="ad-download-meta mono">GIF · 10 min loop</span>
            </div>
            <div className="ad-download-actions">
              <button type="button" className="pill pill-primary" disabled={busy || !images || !code} onClick={download}>
                <Icon name="gif_box" />
                {busy ? `Making… ${Math.round(progress * 100)}%` : "GIF"}
              </button>
            </div>
          </div>
          {busy && (
            <div className="ad-progress" role="progressbar" aria-label="Making the GIF" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <i style={{ width: `${progress * 100}%` }} />
            </div>
          )}
          <p className={`ad-status${status?.tone ? ` is-${status.tone}` : ""}`} role="status" hidden={!status}>
            {status && <Icon name={status.tone === "error" ? "error" : "check_circle"} />}
            {status?.text}
          </p>
        </section>
      </div>
    </div>
  );
}
