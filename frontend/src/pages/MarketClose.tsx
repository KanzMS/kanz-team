import { useCallback, useEffect, useState } from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";
import { ErrorState, Icon } from "../components";
import { ApiError } from "../lib/api";

/* The daily market-close reels. They are made in the cloud by
   youssef-massoudL/Egy-to-tokyo-automation and published on its GitHub Pages
   site, which this page reads: <SOURCE><folder>/latest.json for the latest
   reel, and the repo's public releases for the days before. */
const SOURCE = "https://youssef-massoudl.github.io/Egy-to-tokyo-automation/";
const RELEASES = "https://api.github.com/repos/youssef-massoudL/Egy-to-tokyo-automation/releases?per_page=100";

type View = { slug: string; label: string; title: string; summary: string; folder: string };

const VIEWS: View[] = [
  { slug: "cairo-to-tokyo", label: "Cairo to Tokyo", title: "من القاهرة لطوكيو",
    summary: "Egypt, the Gulf and Asia at the close, every trading day.", folder: "egx" },
  { slug: "europe-to-new-york", label: "Europe to New York", title: "من أوروبا لنيويورك",
    summary: "Europe and the US at the close, every trading day.", folder: "us" },
];
const NAMES: Record<string, string> = {
  egx30: "EGX30 · مصر", tasi: "تاسي · السعودية", dfmgi: "سوق دبي", fadgi: "فوتسي أبوظبي", nifty: "نيفتي 50 · الهند",
  hsi: "هانج سنج · هونج كونج", kospi: "كوسبي 200 · كوريا", n225: "نيكاي 225 · اليابان", dax: "داكس · ألمانيا",
  cac: "كاك 40 · فرنسا", ftse: "فوتسي 100 · بريطانيا", dow: "داو جونز", spx: "إس آند بي 500", ndq: "ناسداك",
  brent: "برنت", gold: "الذهب",
};
const NOTES: Record<string, string> = {
  TEST: "Test run: these numbers are not a real close.",
  "SINGLE SOURCE": "One source (Yahoo): the numbers were not cross-checked.",
  "NEEDS REVIEW": "Needs review: the close was not confirmed in time.",
};

type Reel = { date: string; date_ar: string; weekday: string; status: string; file: string;
  rows: { key: string; pct: number; closed?: boolean }[] };
type Release = { tag_name: string; name: string; draft: boolean;
  assets: { name: string; size: number; browser_download_url: string }[] };

type Loadable<T> =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; error: ApiError }
  | { status: "ready"; data: T };

/** A JSON file from the source site. A 404 means nothing is published there yet. */
function useRemote<T>(url: string): Loadable<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Loadable<T>>({ status: "loading" });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    let stale = false;
    setState({ status: "loading" });
    fetch(url, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new ApiError(r.status, "The market-close site didn't answer. Try again.");
        return r.json();
      })
      .then((data) => !stale && setState(data === null ? { status: "missing" } : { status: "ready", data }))
      .catch((e: unknown) => {
        if (stale) return;
        setState({ status: "error", error: e instanceof ApiError ? e : new ApiError(0, "Could not reach the market-close site. Check your connection and try again.") });
      });
    return () => { stale = true; };
  }, [url, attempt]);
  return { ...state, retry };
}

let releases: Promise<Release[]> | undefined;
function useReleases(prefix: string, ext: string) {
  const [items, setItems] = useState<{ release: Release; asset: Release["assets"][number] }[] | "loading" | "error">("loading");
  useEffect(() => {
    let stale = false;
    releases ??= fetch(RELEASES).then((r) => { if (!r.ok) throw new Error(); return r.json(); });
    releases
      .then((list) => !stale && setItems(list
        .filter((r) => !r.draft && r.tag_name.startsWith(prefix) && !r.tag_name.includes("-test"))
        .flatMap((release) => release.assets.filter((a) => a.name.endsWith(ext)).map((asset) => ({ release, asset })))))
      .catch(() => { releases = undefined; if (!stale) setItems("error"); });
    return () => { stale = true; };
  }, [prefix, ext]);
  return items;
}

/** Saves a file from the source site. A cross-site link ignores `download`, so the file is fetched first. */
async function download(url: string, filename: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    Object.assign(link, { href, download: filename });
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

function DownloadButton({ url, filename, label, primary }: { url: string; filename: string; label: string; primary?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={`pill${primary ? " pill-primary" : ""}`} disabled={busy}
      onClick={async () => { setBusy(true); await download(url, filename); setBusy(false); }}>
      <Icon name={busy ? "progress_activity" : "download"} />
      {busy ? "Downloading…" : label}
    </button>
  );
}

function Note({ status }: { status: string }) {
  if (status === "OK") return null;
  return (
    <p className="mc-note">
      <Icon name="info" />
      {NOTES[status] ?? status}
    </p>
  );
}

function Missing({ what }: { what: string }) {
  return (
    <div className="state-card">
      <Icon name="schedule" />
      <h2 className="state-title">Nothing published yet</h2>
      <p className="state-body">The first {what} shows up here after the next close.</p>
    </div>
  );
}

function Archive({ prefix }: { prefix: string }) {
  const items = useReleases(prefix, ".mp4");
  return (
    <section className="section">
      <h2 className="section-title">Earlier days</h2>
      <div className="panel mc-archive">
        {items === "loading" && <span className="skeleton" style={{ height: 44, margin: 12 }} />}
        {items === "error" && <p className="mc-archive-empty">The archive didn't load. Reload the page to try again.</p>}
        {Array.isArray(items) && items.length === 0 && <p className="mc-archive-empty">No earlier reels yet.</p>}
        {Array.isArray(items) && items.map(({ release, asset }) => (
          <a key={asset.browser_download_url} className="mc-archive-row" href={asset.browser_download_url}>
            <span className="mc-archive-name" dir="auto">{release.name}</span>
            <span className="mc-archive-meta mono">{(asset.size / 1e6).toFixed(1)} MB · MP4</span>
            <Icon name="download" />
          </a>
        ))}
      </div>
    </section>
  );
}

function ReelView({ view }: { view: View }) {
  const base = `${SOURCE}${view.folder}/`;
  const reel = useRemote<Reel>(`${base}latest.json`);
  return (
    <>
      {reel.status === "loading" && <div className="mc-reel section"><span className="skeleton mc-video" /><span className="skeleton" style={{ height: 320 }} /></div>}
      {reel.status === "error" && <div className="section"><ErrorState error={reel.error} retry={reel.retry} /></div>}
      {reel.status === "missing" && <div className="section"><Missing what="reel" /></div>}
      {reel.status === "ready" && (
        <div className="mc-reel section">
          <video className="mc-video" src={`${base}latest.mp4`} poster={`${base}latest.jpg`} controls playsInline preload="metadata" />
          <div className="panel mc-side">
            <div className="mc-side-head">
              <p className="mc-date" dir="auto">{reel.data.weekday} {reel.data.date_ar}</p>
              <p className="mc-date-en mono">{reel.data.date}</p>
            </div>
            <Note status={reel.data.status} />
            <DownloadButton primary url={`${base}latest.mp4`} filename={reel.data.file} label="Download MP4" />
            <table className="mc-table" dir="rtl">
              <tbody>
                {reel.data.rows.map((r) => (
                  <tr key={r.key}>
                    <td>{NAMES[r.key] ?? r.key}</td>
                    <td dir="ltr" className={`mono ${r.closed ? "is-off" : r.pct < 0 ? "is-down" : "is-up"}`}>
                      {r.closed ? "Closed" : `${r.pct > 0 ? "+" : ""}${r.pct.toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Archive prefix={`${view.folder}-`} />
    </>
  );
}

export function MarketClosePage() {
  const { slug } = useParams();
  const view = VIEWS.find((v) => v.slug === slug);
  if (!view) return <Navigate to={`/market-close/${VIEWS[0].slug}`} replace />;

  return (
    <div className="page">
      <h1 className="page-title">Market close</h1>
      <p className="page-sub">The daily close reels, made automatically after the markets close.</p>

      <div className="mc-switch section">
        <nav className="segmented" aria-label="Reel">
          {VIEWS.map((v) => (
            <NavLink key={v.slug} to={`/market-close/${v.slug}`} className="segmented-option mc-option">
              {v.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="section">
        <h2 className="mc-title" dir="rtl">{view.title}</h2>
        <p className="page-sub">{view.summary}</p>
      </div>

      <ReelView key={view.slug} view={view} />
    </div>
  );
}
