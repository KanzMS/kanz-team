import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components";
import { saveFile } from "../../lib/image";
import { DEFAULTS, DUR, FPS, LAY, drawFrame, type Format, type TagShape, type Theme, type WorkshopState } from "./engine";
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
      state.tagPos = { ...fresh().tagPos, ...state.tagPos };
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

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <div className="field-row">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <output className="field-value mono" htmlFor={id}>
          {value > 0 && unit === "px" ? `+${value}` : value}
          {unit}
        </output>
      </div>
      <input id={id} type="range" className="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function Panel({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="panel form-panel" aria-labelledby={id}>
      <h2 className="panel-head" id={id}>
        <Icon name={icon} />
        {title}
      </h2>
      {children}
    </section>
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
  options: { value: T; label: string }[];
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
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

const RESET_CONFIRM_MS = 4000;

export function WorkshopAd() {
  const [state, setState] = useState<WorkshopState>(loadState);
  const [format, setFormat] = useState<Format>("916");
  const [playing, setPlaying] = useState(() => !matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [images, setImages] = useState<Images | null>(null);
  const [customPerson, setCustomPerson] = useState<{ image: HTMLImageElement; url: string } | null>(null);
  const [busy, setBusy] = useState<"png" | "video" | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scrubber = useRef<HTMLInputElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  /** Where the preview is, in seconds; the loop moves it while playing. */
  const time = useRef(playing ? 0 : STILL_TIME);
  const live = useRef({ state, format, playing, images, person: customPerson?.image });
  live.current = { state, format, playing, images, person: customPerson?.image };

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

  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), RESET_CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  // One animation loop for the page's life. It reads the latest inputs from a ref
  // and moves the scrubber and clock directly, so playing never re-renders React.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const { state, format, playing, images, person } = live.current;
      if (playing) {
        // Runs to the end, holds the last frame for a second, then starts again.
        time.current += (now - last) / 1000;
        if (time.current > DUR + 1) time.current = 0;
      }
      last = now;
      const t = Math.min(time.current, DUR);
      const context = canvas.current?.getContext("2d");
      if (context && images) drawFrame(context, format, t, state, { ...images, person: person ?? images.person });
      if (scrubber.current && document.activeElement !== scrubber.current) scrubber.current.value = String(t);
      if (clock.current) clock.current.textContent = `${t.toFixed(1)}s`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => () => {
    if (customPerson) URL.revokeObjectURL(customPerson.url);
  }, [customPerson]);

  const update = (patch: Partial<WorkshopState>) => setState((s) => ({ ...s, ...patch }));
  const setRow = (index: number, column: 0 | 1, value: string) =>
    setState((s) => ({
      ...s,
      rows: s.rows.map((row, i) => (i === index ? (column === 0 ? [value, row[1]] : [row[0], value]) : row)),
    }));
  const titleWords = words(state.title);
  const { W, H } = LAY[format];
  const [tagX, tagY] = state.tagPos[format];
  const moveTag = (x: number, y: number) => setState((s) => ({ ...s, tagPos: { ...s.tagPos, [format]: [x, y] } }));

  function setTitle(title: string) {
    const count = words(title).length;
    update({ title, hl: state.hl.filter((i) => i < count) });
  }

  function toggleWord(index: number) {
    update({ hl: state.hl.includes(index) ? state.hl.filter((i) => i !== index) : [...state.hl, index] });
  }

  function togglePlay() {
    if (!playing && time.current >= DUR) time.current = 0;
    setPlaying(!playing);
  }

  function scrub(value: number) {
    setPlaying(false);
    time.current = value;
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      setCustomPerson({ image: await loadImage(url), url });
      setStatus(null);
    } catch {
      URL.revokeObjectURL(url);
      setStatus({ text: "That file isn't an image that works here. Try a PNG.", tone: "error" });
    }
  }

  function resetPhoto() {
    setCustomPerson(null);
    if (photoInput.current) photoInput.current.value = "";
  }

  function resetAll() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    setState(fresh());
    resetPhoto();
    setStatus({ text: "Everything is back to the original.", tone: "ok" });
  }

  async function exportAd(kind: "png" | "video") {
    if (!images || busy) return;
    const frameImages = { ...images, person: customPerson?.image ?? images.person };
    const target = format;
    setBusy(kind);
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
        const { blob, extension } = await renderVideo(state, frameImages, target, setProgress);
        download(blob, `${fileStem(state, target)}.${extension}`);
        setStatus({ text: `Downloaded ${fileStem(state, target)}.${extension}`, tone: "ok" });
      }
    } catch (error) {
      setStatus({ text: `The download failed: ${error instanceof Error ? error.message : error}`, tone: "error" });
    } finally {
      setBusy(null);
      setProgress(0);
    }
  }

  return (
    <div className="ad-layout">
      <form className="ad-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <Panel icon="title" title="Topic">
          <Field label="Workshop name">
            {(id) => <input id={id} className="input" dir="auto" value={state.chip} onChange={(e) => update({ chip: e.target.value })} />}
          </Field>
          <Field label="Line above the title">
            {(id) => <input id={id} className="input" dir="auto" value={state.kicker} onChange={(e) => update({ kicker: e.target.value })} />}
          </Field>
          <Field label="Title" hint="Press Enter for a new line. A long title splits into two lines on its own.">
            {(id) => <textarea id={id} className="input" dir="auto" rows={1} value={state.title} onChange={(e) => setTitle(e.target.value)} />}
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
              <p className="field-hint">Tap a word to colour it in the ad.</p>
            </div>
          )}
          <Field label="Closing line">
            {(id) => <input id={id} className="input" dir="auto" value={state.cta} onChange={(e) => update({ cta: e.target.value })} />}
          </Field>
        </Panel>

        <Panel icon="event" title="When">
          <div className="field-pair">
            <Field label="Day">
              {(id) => <input id={id} className="input" dir="auto" value={state.day} onChange={(e) => update({ day: e.target.value })} />}
            </Field>
            <Field label="Date">
              {(id) => <input id={id} className="input" dir="ltr" value={state.date} onChange={(e) => update({ date: e.target.value })} />}
            </Field>
          </div>
          <div className="subgroup">
            <div className="field-row">
              <span className="field-label" id="tag-shape-label">
                Day and date tag
              </span>
              {(tagX !== 0 || tagY !== 0 || state.tagScale !== 100) && (
                <button type="button" className="text-button is-small" onClick={() => { moveTag(0, 0); update({ tagScale: 100 }); }}>
                  <Icon name="restart_alt" />
                  Reset position
                </button>
              )}
            </div>
            <Segmented<TagShape>
              label="Tag shape"
              value={state.tagShape}
              onChange={(tagShape) => update({ tagShape })}
              options={[
                { value: "tilted", label: "Tilted" },
                { value: "straight", label: "Straight" },
                { value: "pill", label: "Pill" },
              ]}
            />
            <Slider label="Size" value={state.tagScale} min={70} max={150} step={1} unit="%" onChange={(tagScale) => update({ tagScale })} />
            <div className="field-pair">
              <Slider label="Left / right" value={tagX} min={-400} max={400} step={2} unit="px" onChange={(x) => moveTag(x, tagY)} />
              <Slider label="Up / down" value={tagY} min={-300} max={300} step={2} unit="px" onChange={(y) => moveTag(tagX, y)} />
            </div>
            <p className="field-hint">Position is kept separately for {format === "sq" ? "X 1:1" : "Reels 9:16"}.</p>
          </div>
          <Field label="Times card heading">
            {(id) => <input id={id} className="input" dir="auto" value={state.tHead} onChange={(e) => update({ tHead: e.target.value })} />}
          </Field>
          <div className="field">
            <div className="time-row time-head" aria-hidden="true">
              <span className="field-label">Country</span>
              <span className="field-label">Time</span>
            </div>
            <div className="time-rows">
              {state.rows.map(([country, time], i) => (
                <div className="time-row" key={i}>
                  <input className="input" dir="auto" aria-label={`Country ${i + 1}`} value={country} onChange={(e) => setRow(i, 0, e.target.value)} />
                  <input className="input input-time" dir="ltr" aria-label={`Time ${i + 1}`} value={time} onChange={(e) => setRow(i, 1, e.target.value)} />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove ${country || `row ${i + 1}`}`}
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
              className="text-button"
              disabled={state.rows.length >= MAX_ROWS}
              onClick={() => update({ rows: [...state.rows, ["", ""]] })}
            >
              <Icon name="add" />
              {state.rows.length >= MAX_ROWS ? `Up to ${MAX_ROWS} countries` : "Add a country"}
            </button>
          </div>
        </Panel>

        <Panel icon="person" title="Presenter">
          <Field label="Name">
            {(id) => <input id={id} className="input" dir="auto" value={state.name} onChange={(e) => update({ name: e.target.value })} />}
          </Field>
          <Field label="Role">
            {(id) => <input id={id} className="input" dir="auto" value={state.role} onChange={(e) => update({ role: e.target.value })} />}
          </Field>
          <div className="field">
            <span className="field-label">Photo</span>
            <div className="photo-row">
              <img className="photo-thumb" src={customPerson?.url ?? personUrl} alt="" />
              <div className="photo-text">
                <span className="photo-name">{customPerson ? "Your photo" : "Original photo"}</span>
                <span className="field-hint">PNG or WebP with a transparent background, cut off at the bottom.</span>
                <div className="photo-actions">
                  <label className="pill">
                    <Icon name="upload" />
                    {customPerson ? "Replace" : "Upload"}
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
                      Use original
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="field-pair">
            <Slider label="Photo size" value={state.pScale} min={70} max={130} step={1} unit="%" onChange={(pScale) => update({ pScale })} />
            <Slider label="Photo position" value={state.pX} min={-200} max={200} step={2} unit="px" onChange={(pX) => update({ pX })} />
          </div>
        </Panel>

        <div className="form-foot">
          <p className="field-hint">
            <Icon name="cloud_done" />
            Your edits are saved in this browser.
          </p>
          <button type="button" className={`text-button${confirmReset ? " is-danger" : ""}`} onClick={resetAll}>
            <Icon name="restart_alt" />
            {confirmReset ? "Click again to reset" : "Reset everything"}
          </button>
        </div>
      </form>

      <section className="panel ad-stage" aria-label="Preview and download">
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
        </div>

        <div className="ad-view">
          {!images && <span className="skeleton ad-canvas" style={{ aspectRatio: `${W} / ${H}` }} />}
          <canvas ref={canvas} className="ad-canvas" width={W} height={H} hidden={!images} role="img" aria-label="Preview of the ad" />
        </div>

        <div className="ad-transport">
          <button type="button" className="icon-button is-solid" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}>
            <Icon name={playing ? "pause" : "play_arrow"} />
          </button>
          <input
            ref={scrubber}
            type="range"
            className="range ad-scrubber"
            aria-label="Time in the animation"
            min={0}
            max={DUR}
            step={0.01}
            defaultValue={time.current}
            onChange={(e) => scrub(+e.target.value)}
          />
          <span className="ad-clock mono" aria-hidden="true">
            <span ref={clock}>0.0s</span> / {DUR.toFixed(1)}s
          </span>
        </div>

        <div className="ad-download">
          <div className="ad-download-info">
            <span className="ad-download-title">Download</span>
            <span className="ad-download-meta mono">
              {W} × {H} px
            </span>
          </div>
          <div className="ad-download-actions">
            <button type="button" className="pill pill-primary" disabled={!!busy || !images} onClick={() => exportAd("png")}>
              <Icon name="image" />
              {busy === "png" ? "Making…" : "Image"}
            </button>
            <button type="button" className="pill" disabled={!!busy || !images} onClick={() => exportAd("video")}>
              <Icon name="movie" />
              {busy === "video" ? `Making… ${Math.round(progress * 100)}%` : `Video · ${DUR}s`}
            </button>
          </div>
        </div>
        {busy === "video" && (
          <div className="ad-progress" role="progressbar" aria-label="Making the video" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <i style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <p className={`ad-status${status?.tone ? ` is-${status.tone}` : ""}`} role="status" hidden={!status}>
          {status && <Icon name={status.tone === "error" ? "error" : "check_circle"} />}
          {status?.text}
        </p>
      </section>
    </div>
  );
}
