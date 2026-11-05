import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { Navigate, NavLink, useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { EmptyState, ErrorState, Icon } from "../components";
import { useApi } from "../lib/api";
import { saveFile } from "../lib/image";

type DocMeta = { slug: string; title: string; summary: string; icon: string };
type Doc = DocMeta & { body: string };

function downloadDoc({ slug, title, body }: Doc) {
  const url = URL.createObjectURL(
    new Blob([`# ${title}\n\n${body}\n`], { type: "text/markdown;charset=utf-8" }),
  );
  saveFile(url, `${slug}.md`);
  URL.revokeObjectURL(url);
}

function DocBody({ slug }: { slug: string }) {
  const doc = useApi<Doc>(`/api/docs/${encodeURIComponent(slug)}`);

  if (doc.status === "error") return <ErrorState error={doc.error} retry={doc.retry} />;
  if (doc.status === "loading") {
    return (
      <div className="doc doc-skeleton" aria-busy="true" aria-label="Loading">
        <span className="skeleton" style={{ width: "45%", height: 28 }} />
        <span className="skeleton" style={{ height: 14 }} />
        <span className="skeleton" style={{ height: 14 }} />
        <span className="skeleton" style={{ width: "70%", height: 14 }} />
      </div>
    );
  }
  return (
    <article className="doc prose">
      <div className="doc-head" dir="auto">
        <h1>{doc.data.title}</h1>
        <button type="button" className="pill" onClick={() => downloadDoc(doc.data)}>
          <Icon name="download" />
          Download
        </button>
      </div>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Lists and tables take their text's direction, so Arabic runs right to left.
          ul: ({ children }) => <ul dir="auto">{children}</ul>,
          ol: ({ children }) => <ol dir="auto">{children}</ol>,
          table: ({ children }) => (
            <div className="prose-table">
              <table dir="auto">{children}</table>
            </div>
          ),
        }}
      >
        {doc.data.body}
      </Markdown>
    </article>
  );
}

export function DocsPage() {
  const { slug } = useParams();
  const docs = useApi<DocMeta[]>("/api/docs");
  const list = useRef<HTMLElement>(null);

  // On a phone the list is one sideways row: keep the open document's pill in view.
  useEffect(() => {
    list.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [slug, docs.status]);

  return (
    <div className="page">
      <h1 className="page-title">Brand docs</h1>
      <p className="page-sub">What Kanz is, who it's for and how we show up.</p>

      {docs.status === "loading" && (
        <div className="docs-layout" aria-busy="true" aria-label="Loading">
          <span className="skeleton" style={{ height: 240 }} />
          <span className="skeleton" style={{ height: 420 }} />
        </div>
      )}
      {docs.status === "error" && (
        <div className="section">
          <ErrorState error={docs.error} retry={docs.retry} />
        </div>
      )}
      {docs.status === "ready" && docs.data.length === 0 && (
        <div className="section">
          <EmptyState icon="description" title="No documents yet">
            Add Markdown files to <code>content/docs</code> and they show up here.
          </EmptyState>
        </div>
      )}
      {docs.status === "ready" && docs.data.length > 0 && !slug && (
        <Navigate to={`/docs/${docs.data[0].slug}`} replace />
      )}
      {docs.status === "ready" && docs.data.length > 0 && slug && (
        <div className="docs-layout">
          <nav ref={list} className="docs-list" aria-label="Documents">
            {docs.data.map((doc) => (
              <NavLink key={doc.slug} to={`/docs/${doc.slug}`} className="docs-link">
                <Icon name={doc.icon} />
                <span className="docs-link-text">
                  <span className="docs-link-title" dir="auto">
                    {doc.title}
                  </span>
                  {doc.summary && (
                    <span className="docs-link-summary" dir="auto">
                      {doc.summary}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>
          <DocBody key={slug} slug={slug} />
        </div>
      )}
    </div>
  );
}
