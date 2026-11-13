import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Icon } from "./components";
import { siteUrl } from "./lib/api";
import { DocsPage } from "./pages/Docs";
import { LibraryPage } from "./pages/Library";
import { TemplatesPage } from "./pages/Templates";
import { WorkshopCtaPage } from "./pages/WorkshopCta";

function Header() {
  return (
    <header className="header">
      <div className="header-pill">
        <Link to="/" className="brand" aria-label="Kanz team, home">
          <img src={siteUrl("kanz-mark.png")} alt="" width={36} height={36} />
        </Link>
        <nav className="header-nav" aria-label="Main">
          <NavLink to="/library" className="nav-link">
            <Icon name="photo_library" />
            Library
          </NavLink>
          <NavLink to="/docs" className="nav-link">
            <Icon name="description" />
            Brand docs
          </NavLink>
          <NavLink to="/templates" className="nav-link">
            <Icon name="draw" />
            Templates
          </NavLink>
          <NavLink to="/workshop-cta" className="nav-link">
            <Icon name="gif_box" />
            Workshop CTA
          </NavLink>
          <a href={siteUrl("website/")} className="nav-link">
            <Icon name="language" />
            Website
          </a>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  return (
    <div className="shell">
      <Header />
      <main>
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:slug" element={<DocsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/:slug" element={<TemplatesPage />} />
          <Route path="/workshop-cta" element={<WorkshopCtaPage />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </main>
    </div>
  );
}
