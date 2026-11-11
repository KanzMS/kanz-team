import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components";
import { saveFile } from "../../lib/image";
import { DEFAULTS, DUR, FPS, LAY, drawFrame, type Format, type Theme, type WorkshopState } from "./engine";
import logoUrl from "./logo.png";
import personUrl from "./person.webp";

const STORAGE_KEY = "kanz-workshop-template-v1";
const MAX_ROWS = 7;
const STILL_TIME = DUR - 0.1;
const FONT = "IBM Plex Sans Arabic";

type Images = { person: HTMLImageElement; logo: HTMLImageElement };
type Status = { text: string; tone?: "ok" | "error" };

function fresh(): WorkshopState {
  return structuredClone(DEFAULTS);
}

function loadState(): WorkshopState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && Array.isArray(saved.rows)) {
      const state = { ...fresh(), ...saved };
      if (!Array.isArray(state.hl)) state.hl = [];
      if (state.theme !== "urgent") state.theme = "weekly";
      return state;
    }
  } catch {
    // Storage can be blocked or hold something old: start from the defaults.
  }
  return fresh();
}

function words(title: string): string[] {
  return title.trim().split(/\s+/).filter(Boolean);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

function fileStem(state: WorkshopState, format: Format): string {
  const date = state.date.replace(/[^0-9a-z-]/gi, "");
  return `kanz-workshop${date ? `-${date}` : ""}-${format === "sq" ? "1x1" : "9x16"}`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  saveFile(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function offscreen(format: Format) {
  const canvas = document.createElement("canvas");
  canvas.width = LAY[format].W;
  canvas.height = LAY[format].H;
  return { canvas, context: canvas.getContext("2d")! };
}

async function pickCodec(width: number, height: number): Promise<string | null> {
  if (!("VideoEncoder" in window)) return null;
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42003e"]) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 12e6, framerate: FPS });
      if (supported) return codec;
    } catch {
      // Try the next profile.
    }
  }
  return null;
}

/** Renders every frame and encodes an MP4; falls back to recording a WebM in real time. */
async function renderVideo(
  state: WorkshopState,
  images: Images,
  format: Format,
  onProgress: (share: number) => void,
): Promise<{ blob: Blob; extension: string }> {
  const { W, H } = LAY[format];
  const { canvas, context } = offscreen(format);
  const frames = Math.round(DUR * FPS);
  const codec = await pickCodec(W, H);

  if (codec) {
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width: W, height: H, frameRate: FPS },
      fastStart: "in-memory",
    });
    let failure: unknown = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (error) => {
        failure = error;
      },
    });
    encoder.configure({ codec, width: W, height: H, bitrate: 12e6, framerate: FPS });
    for (let i = 0; i < frames && !failure; i++) {
      drawFrame(context, format, i / FPS, state, images);
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round((i * 1e6) / FPS),
        duration: Math.round(1e6 / FPS),
      });
      encoder.encode(frame, { keyFrame: i % FPS === 0 });
      frame.close();
      onProgress((i + 1) / frames);
      while (encoder.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    if (!failure) {
      await encoder.flush();
      muxer.finalize();
      return { blob: new Blob([muxer.target.buffer], { type: "video/mp4" }), extension: "mp4" };
    }
  }

  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    throw new Error("This browser can't make videos. Try Chrome or Edge.");
  }
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
  const recorder = new MediaRecorder(canvas.captureStream(FPS), { mimeType, videoBitsPerSecond: 12e6 });
  const parts: Blob[] = [];
  recorder.ondataavailable = (event) => event.data.size && parts.push(event.data);
  const stopped = new Promise((r) => (recorder.onstop = r));
  recorder.start();
  const start = performance.now();
  await new Promise<void>((resolve) => {
    (function step() {
      const t = Math.min((performance.now() - start) / 1000, DUR);
      drawFrame(context, format, t, state, images);
      onProgress(t / DUR);
      if (t < DUR) requestAnimationFrame(step);
      else resolve();
    })();
  });
  recorder.stop();
  await stopped;
  return { blob: new Blob(parts, { type: "video/webm" }), extension: "webm" };
}

/* ── Controls ────────────────────────────────────────────────────────────── */

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented-option"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <Icon name={option.icon} />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export function WorkshopAd() {
  const [state, setState] = useState<WorkshopState>(loadState);
  const [format, setFormat] = useState<Format>("916");
  const [playing, setPlaying] = useState(() => !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [images, setImages] = useState<Images | null>(null);
  const [customPerson, setCustomPerson] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const live = useRef({ state, format, playing, images, customPerson });
  live.current = { state, format, playing, images, customPerson };

  // The ad's font and pictures have to be in before the first frame, or text measures wrong.
  useEffect(() => {
    let stale = false;
    const sample = "الورشة الأسبوعية قراءة التوقيتات 0123456789:-";
    Promise.all([
      Promise.all([300, 400, 500, 600, 700].map((w) => document.fonts.load(`${w} 40px "${FONT}"`, sample))).catch(() => {}),
      loadImage(personUrl),
      loadImage(logoUrl),
    ])
      .then(([, person, logo]) => {
        if (!stale) setImages({ person, logo });
      })
      .catch(() => {
        if (!stale) setStatus({ text: "The ad's pictures didn't load. Reload the page.", tone: "error" });
      });
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Not saved between visits; the page still works.
    }
  }, [state]);

  // One animation loop for the page's life; it reads the latest inputs from a ref.
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const { state, format, playing, images, customPerson } = live.current;
      const context = canvas.current?.getContext("2d");
      if (context && images) {
        const t = playing ? Math.min(((performance.now() - start) / 1000) % (DUR + 1), DUR) : STILL_TIME;
        drawFrame(context, format, t, state, { ...images, person: customPerson ?? images.person });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const update = (patch: Partial<WorkshopState>) => setState((s) => ({ ...s, ...patch }));
  const setRow = (index: number, column: 0 | 1, value: string) =>
    setState((s) => ({
      ...s,
      rows: s.rows.map((row, i) => (i === index ? (column === 0 ? [value, row[1]] : [row[0], value]) : row)),
    }));
  const titleWords = words(state.title);

  function setTitle(title: string) {
    const count = words(title).length;
    update({ title, hl: state.hl.filter((i) => i < count) });
  }

  function toggleWord(index: number) {
    update({ hl: state.hl.includes(index) ? state.hl.filter((i) => i !== index) : [...state.hl, index] });
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    try {
      setCustomPerson(await loadImage(URL.createObjectURL(file)));
      setStatus({ text: "Photo changed.", tone: "ok" });
    } catch {
      setStatus({ text: "That file isn't an image that works here. Try a PNG.", tone: "error" });
    }
  }

  function resetPhoto() {
    setCustomPerson(null);
    if (photoInput.current) photoInput.current.value = "";
  }

  function resetAll() {
    setState(fresh());
    resetPhoto();
    setStatus({ text: "Everything is back to the original.", tone: "ok" });
  }

  async function exportAd(kind: "png" | "video", target: Format) {
    if (!images) return;
    const frameImages = { ...images, person: customPerson ?? images.person };
    setBusy(true);
    setProgress(0);
    setStatus(null);
    try {
      await document.fonts.ready;
      if (kind === "png") {
        const { canvas, context } = offscreen(target);
        drawFrame(context, target, STILL_TIME, state, frameImages);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
        if (!blob) throw new Error("The image couldn't be made.");
        download(blob, `${fileStem(state, target)}.png`);
        setStatus({ text: `Downloaded ${fileStem(state, target)}.png`, tone: "ok" });
      } else {
        const { blob, extension } = await renderVideo(state, frameImages, target, (share) => {
          setProgress(share);
          setStatus({ text: `Making the video… ${Math.round(share * 100)}%` });
        });
        download(blob, `${fileStem(state, target)}.${extension}`);
        setStatus({ text: `Downloaded ${fileStem(state, target)}.${extension}`, tone: "ok" });
      }
    } catch (error) {
      setStatus({ text: `The export failed: ${error instanceof Error ? error.message : error}`, tone: "error" });
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <div className="ad-layout">
      <form className="ad-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <fieldset className="panel">
          <legend className="panel-title">Topic</legend>
          <Field label="Workshop name">
            {(id) => <input id={id} className="input" dir="auto" value={state.chip} onChange={(e) => update({ chip: e.target.value })} />}
          </Field>
          <Field label="Line above the title">
            {(id) => <input id={id} className="input" dir="auto" value={state.kicker} onChange={(e) => update({ kicker: e.target.value })} />}
          </Field>
          <Field label="Title" hint="Press Enter for a new line. A long title splits into two lines on its own.">
            {(id) => <textarea id={id} className="input" dir="auto" rows={2} value={state.title} onChange={(e) => setTitle(e.target.value)} />}
          </Field>
          {titleWords.length > 0 && (
            <div className="field">
              <span className="field-label" id="hl-label">
                Highlighted words
              </span>
              <div className="word-chips" role="group" aria-labelledby="hl-label" dir="rtl">
                {titleWords.map((word, i) => (
                  <button key={`${i}-${word}`} type="button" className="word-chip" aria-pressed={state.hl.includes(i)} onClick={() => toggleWord(i)}>
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Field label="Closing line">
            {(id) => <input id={id} className="input" dir="auto" value={state.cta} onChange={(e) => update({ cta: e.target.value })} />}
          </Field>
        </fieldset>

        <fieldset className="panel">
          <legend className="panel-title">When</legend>
          <div className="field-pair">
            <Field label="Day">
              {(id) => <input id={id} className="input" dir="auto" value={state.day} onChange={(e) => update({ day: e.target.value })} />}
            </Field>
            <Field label="Date">
              {(id) => <input id={id} className="input" dir="ltr" value={state.date} onChange={(e) => update({ date: e.target.value })} />}
            </Field>
          </div>
          <Field label="Times card heading">
            {(id) => <input id={id} className="input" dir="auto" value={state.tHead} onChange={(e) => update({ tHead: e.target.value })} />}
          </Field>
          <div className="field">
            <span className="field-label">Times</span>
            <div className="time-rows">
              {state.rows.map(([country, time], i) => (
                <div className="time-row" key={i}>
                  <input className="input" dir="auto" aria-label={`Country ${i + 1}`} value={country} onChange={(e) => setRow(i, 0, e.target.value)} />
                  <input className="input input-time" dir="ltr" aria-label={`Time ${i + 1}`} value={time} onChange={(e) => setRow(i, 1, e.target.value)} />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove row ${i + 1}`}
                    disabled={state.rows.length <= 1}
                    onClick={() => update({ rows: state.rows.filter((_, j) => j !== i) })}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="pill add-row"
              disabled={state.rows.length >= MAX_ROWS}
              onClick={() => update({ rows: [...state.rows, ["", ""]] })}
            >
              <Icon name="add" />
              Add a country
            </button>
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend className="panel-title">Presenter</legend>
          <Field label="Name">
            {(id) => <input id={id} className="input" dir="auto" value={state.name} onChange={(e) => update({ name: e.target.value })} />}
          </Field>
          <Field label="Role">
            {(id) => <input id={id} className="input" dir="auto" value={state.role} onChange={(e) => update({ role: e.target.value })} />}
          </Field>
          <div className="field">
            <span className="field-label">Photo</span>
            <div className="photo-actions">
              <label className="pill">
                <Icon name="upload" />
                Upload a photo
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/png,image/webp"
                  className="visually-hidden"
                  onChange={(e) => choosePhoto(e.target.files?.[0])}
                />
              </label>
              {customPerson && (
                <button type="button" className="pill" onClick={resetPhoto}>
                  <Icon name="undo" />
                  Original photo
                </button>
              )}
            </div>
            <p className="field-hint">A PNG with a transparent background, cut off at the bottom in the middle.</p>
          </div>
          <div className="field-pair">
            <Field label="Photo size">
              {(id) => (
                <input id={id} type="range" className="range" min={70} max={130} step={1} value={state.pScale} onChange={(e) => update({ pScale: +e.target.value })} />
              )}
            </Field>
            <Field label="Photo position">
              {(id) => (
                <input id={id} type="range" className="range" min={-200} max={200} step={2} value={state.pX} onChange={(e) => update({ pX: +e.target.value })} />
              )}
            </Field>
          </div>
        </fieldset>

        <button type="button" className="pill reset-all" onClick={resetAll}>
          <Icon name="restart_alt" />
          Reset everything
        </button>
      </form>

      <section className="panel ad-stage" aria-label="Preview">
        <div className="ad-toolbar">
          <Segmented<Format>
            label="Size"
            value={format}
            onChange={setFormat}
            options={[
              { value: "916", label: "Reels 9:16" },
              { value: "sq", label: "X 1:1" },
            ]}
          />
          <Segmented<Theme>
            label="Look"
            value={state.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "urgent", label: "Urgent" },
            ]}
          />
          <Segmented<"play" | "still">
            label="Playback"
            value={playing ? "play" : "still"}
            onChange={(v) => setPlaying(v === "play")}
            options={[
              { value: "play", label: "Play", icon: "play_arrow" },
              { value: "still", label: "Last frame", icon: "pause" },
            ]}
          />
        </div>

        <div className="ad-view">
          {!images && <span className="skeleton ad-skeleton" style={{ aspectRatio: format === "sq" ? "1" : "9 / 16" }} />}
          <canvas
            ref={canvas}
            className="ad-canvas"
            width={LAY[format].W}
            height={LAY[format].H}
            hidden={!images}
            role="img"
            aria-label="Preview of the ad"
          />
        </div>

        <div className="ad-exports">
          <button type="button" className="pill pill-primary" disabled={busy || !images} onClick={() => exportAd("png", "916")}>
            <Icon name="image" />
            Image 9:16
          </button>
          <button type="button" className="pill pill-primary" disabled={busy || !images} onClick={() => exportAd("png", "sq")}>
            <Icon name="image" />
            Image 1:1
          </button>
          <button type="button" className="pill" disabled={busy || !images} onClick={() => exportAd("video", "916")}>
            <Icon name="movie" />
            Video 9:16
          </button>
          <button type="button" className="pill" disabled={busy || !images} onClick={() => exportAd("video", "sq")}>
            <Icon name="movie" />
            Video 1:1
          </button>
        </div>
        <div className="ad-progress" aria-hidden="true">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <p className={`ad-status${status?.tone ? ` is-${status.tone}` : ""}`} role="status">
          {status?.text}
        </p>
      </section>
    </div>
  );
}
