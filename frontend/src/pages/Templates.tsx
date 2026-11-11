import { useEffect, useRef } from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";
import { EmptyState, ErrorState, Icon } from "../components";
import { ApiError, siteUrl, useApi } from "../lib/api";

type Template = { slug: string; title: string; summary: string; icon: string; file: string };

function TemplateFrame({ template }: { template: Template }) {
  const src = siteUrl(`content/templates/${encodeURIComponent(template.file)}`);
  return (
    <section className="template">
      <div className="template-head">
        <div className="template-info">
          <h2 className="template-title" dir="auto">
            {template.title}
          </h2>
          {template.summary && (
            <p className="template-summary" dir="auto">
              {template.summary}
            </p>
          )}
        </div>
        <a className="pill" href={src} target="_blank" rel="noopener">
          <Icon name="open_in_new" />
          Open on its own
        </a>
      </div>
      <iframe className="template-frame" src={src} title={template.title} />
    </section>
  );
}

export function TemplatesPage() {
  const { slug } = useParams();
  const templates = useApi<Template[]>("templates.json");
  const list = useRef<HTMLElement>(null);

  useEffect(() => {
    list.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [slug, templates.status]);

  const current = templates.status === "ready" ? templates.data.find((t) => t.slug === slug) : undefined;

  return (
    <div className="page">
      <h1 className="page-title">Templates</h1>
      <p className="page-sub">Fill in the details and download a ready post, as an image or a video.</p>

      {templates.status === "loading" && (
        <div className="section" aria-busy="true" aria-label="Loading">
          <span className="skeleton" style={{ display: "block", height: 560 }} />
        </div>
      )}
      {templates.status === "error" && (
        <div className="section">
          <ErrorState error={templates.error} retry={templates.retry} />
        </div>
      )}
      {templates.status === "ready" && templates.data.length === 0 && (
        <div className="section">
          <EmptyState icon="draw" title="No templates yet">
            Add HTML files to <code>content/templates</code> and they show up here.
          </EmptyState>
        </div>
      )}
      {templates.status === "ready" && templates.data.length > 0 && !slug && (
        <Navigate to={`/templates/${templates.data[0].slug}`} replace />
      )}
      {templates.status === "ready" && slug && templates.data.length > 0 && (
        <>
          {templates.data.length > 1 && (
            <nav ref={list} className="template-list" aria-label="Templates">
              {templates.data.map((t) => (
                <NavLink key={t.slug} to={`/templates/${t.slug}`} className="docs-link">
                  <Icon name={t.icon} />
                  <span className="docs-link-title" dir="auto">
                    {t.title}
                  </span>
                </NavLink>
              ))}
            </nav>
          )}
          <div className="section">
            {current ? (
              <TemplateFrame key={current.slug} template={current} />
            ) : (
              <ErrorState error={new ApiError(404, "This isn't on the site.")} retry={templates.retry} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
