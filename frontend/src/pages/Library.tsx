import { useEffect, useRef, useState } from "react";
import { EmptyState, ErrorState, Icon } from "../components";
import { useApi, useApiFetch } from "../lib/api";
import { copyImage, prepareImage, saveFile, type PreparedImage } from "../lib/image";

const COPIED_MS = 1800;
const TOAST_MS = 5000;
/** Listed first and open on arrival; every other section starts collapsed. */
const FIRST_CATEGORY = "Logos";

type Asset = {
  path: string;
  name: string;
  filename: string;
  category: string;
  format: string;
  bytes: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function usePreparedImage(path: string) {
  const apiFetch = useApiFetch();
  const [state, setState] = useState<"loading" | "error" | PreparedImage>("loading");

  useEffect(() => {
    let stale = false;
    let url: string | undefined;
    setState("loading");
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    apiFetch(`/api/assets/file/${encoded}`)
      .then((response) => response.blob())
      .then(prepareImage)
      .then((prepared) => {
        url = prepared.url;
        if (stale) URL.revokeObjectURL(url);
        else setState(prepared);
      })
      .catch(() => {
        if (!stale) setState("error");
      });
    return () => {
      stale = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [apiFetch, path]);

  return state;
}

function AssetCard({ asset, onCopyFailed }: { asset: Asset; onCopyFailed: () => void }) {
  const image = usePreparedImage(asset.path);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const ready = typeof image === "object" ? image : null;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    if (!ready) return;
    try {
      await copyImage(ready.png);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      onCopyFailed();
    }
  }

  return (
    <article className="asset-card">
      <button
        type="button"
        className={`asset-tile${copied ? " is-copied" : ""}`}
        data-tone={ready?.tone ?? "any"}
        disabled={!ready}
        aria-label={copied ? `${asset.name} copied` : `Copy ${asset.name}`}
        onClick={copy}
      >
        {image === "loading" && <span className="skeleton" />}
        {image === "error" && (
          <span className="asset-broken">
            <Icon name="broken_image" />
            This image didn't load
          </span>
        )}
        {ready && <img src={ready.url} alt="" draggable={false} />}
        {ready && (
          <span className="asset-hint" aria-hidden="true">
            <Icon name={copied ? "check_circle" : "content_copy"} />
            {copied ? "Copied" : "Click to copy"}
          </span>
        )}
      </button>
      <div className="asset-foot">
        <div className="asset-info">
          <h3 className="asset-name" dir="auto">
            {asset.name}
          </h3>
          <p className="asset-meta mono">
            <span>{asset.format}</span>
            {ready && (
              <span>
                {ready.width} × {ready.height}
              </span>
            )}
            <span>{formatSize(asset.bytes)}</span>
          </p>
        </div>
        <button
          type="button"
          className="pill"
          disabled={!ready}
          aria-label={`Download ${asset.name}`}
          onClick={() => ready && saveFile(ready.url, asset.filename)}
        >
          <Icon name="download" />
          Download
        </button>
      </div>
    </article>
  );
}

function AssetSection({
  category,
  assets,
  onCopyFailed,
}: {
  category: string;
  assets: Asset[];
  onCopyFailed: () => void;
}) {
  const startsOpen = category === FIRST_CATEGORY;
  // A section's images load the first time it opens, then stay ready to copy.
  const [everOpened, setEverOpened] = useState(startsOpen);

  return (
    <details
      className="section asset-section"
      open={startsOpen}
      onToggle={(event) => {
        if (event.currentTarget.open) setEverOpened(true);
      }}
    >
      <summary className="asset-section-head">
        <Icon name="expand_more" />
        <h2 className="asset-section-title" dir="auto">
          {category}
        </h2>
        <span className="asset-section-count">
          {assets.length} {assets.length === 1 ? "image" : "images"}
        </span>
      </summary>
      {everOpened && (
        <div className="asset-grid">
          {assets.map((asset) => (
            <AssetCard key={asset.path} asset={asset} onCopyFailed={onCopyFailed} />
          ))}
        </div>
      )}
    </details>
  );
}

function SkeletonGrid() {
  return (
    <div className="asset-grid section" aria-busy="true" aria-label="Loading">
      {[0, 1, 2, 3].map((n) => (
        <span key={n} className="skeleton" style={{ aspectRatio: "1 / 1" }} />
      ))}
    </div>
  );
}

export function LibraryPage() {
  const assets = useApi<Asset[]>("/api/assets");
  const [copyFailed, setCopyFailed] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  function showCopyFailed() {
    setCopyFailed(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setCopyFailed(false), TOAST_MS);
  }

  const categories =
    assets.status === "ready"
      ? [...new Set(assets.data.map((asset) => asset.category))].sort(
          (a, b) => Number(b === FIRST_CATEGORY) - Number(a === FIRST_CATEGORY),
        )
      : [];

  return (
    <div className="page">
      <h1 className="page-title">Logos and designs</h1>
      <p className="page-sub">Click any one to copy it, then paste it where you need it.</p>

      {assets.status === "loading" && <SkeletonGrid />}
      {assets.status === "error" && (
        <div className="section">
          <ErrorState error={assets.error} retry={assets.retry} />
        </div>
      )}
      {assets.status === "ready" && assets.data.length === 0 && (
        <div className="section">
          <EmptyState icon="photo_library" title="Nothing here yet">
            Add image files to <code>content/assets</code> and they show up here.
          </EmptyState>
        </div>
      )}
      {assets.status === "ready" &&
        categories.map((category) => (
          <AssetSection
            key={category}
            category={category}
            assets={assets.data.filter((asset) => asset.category === category)}
            onCopyFailed={showCopyFailed}
          />
        ))}

      <div aria-live="polite">
        {copyFailed && (
          <p className="toast" role="status">
            <Icon name="error" />
            Your browser blocked the copy. Use Download instead.
          </p>
        )}
      </div>
    </div>
  );
}
