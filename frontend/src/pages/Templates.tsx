import { Navigate, NavLink, useParams } from "react-router-dom";
import { Icon } from "../components";
import { TEMPLATES } from "../templates";

export function TemplatesPage() {
  const { slug } = useParams();
  const current = TEMPLATES.find((t) => t.slug === slug);

  if (!current) return <Navigate to={`/templates/${TEMPLATES[0].slug}`} replace />;

  return (
    <div className="page">
      <h1 className="page-title">{TEMPLATES.length > 1 ? "Templates" : current.title}</h1>
      <p className="page-sub">{current.summary} Fill in the details, watch it move, then download it.</p>

      {TEMPLATES.length > 1 && (
        <nav className="template-list" aria-label="Templates">
          {TEMPLATES.map((t) => (
            <NavLink key={t.slug} to={`/templates/${t.slug}`} className="docs-link">
              <Icon name={t.icon} />
              <span className="docs-link-title">{t.title}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <div className="section">
        <current.Component key={current.slug} />
      </div>
    </div>
  );
}
