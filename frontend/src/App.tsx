import { useState, type FormEvent } from "react";
import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Icon } from "./components";
import { useAuth } from "./lib/auth";
import { DocsPage } from "./pages/Docs";
import { LibraryPage } from "./pages/Library";

function Header() {
  const { signOut } = useAuth();
  return (
    <header className="header">
      <div className="header-pill">
        <Link to="/" className="brand" aria-label="Kanz team, home">
          <img src="/kanz-mark.png" alt="" width={36} height={36} />
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
        </nav>
        <div className="header-end">
          <button type="button" className="nav-link" aria-label="Sign out" onClick={signOut}>
            <Icon name="logout" />
            <span className="nav-link-word">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function SignInPage() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const failure = await signIn(username, password);
    if (failure) {
      setError(failure);
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <img className="auth-logo" src="/kanz-mark.png" alt="Kanz" width={88} height={88} />
      <div>
        <h1 className="auth-title">Kanz team</h1>
        <p className="auth-sub">Logos, designs and brand docs, in one place.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Username</span>
          <input
            className="field-input"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="field-input"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="auth-error" role="alert">
            <Icon name="error" />
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export function App() {
  const { status } = useAuth();

  if (status === "checking") return <div className="shell" aria-busy="true" />;
  if (status === "signedOut") {
    return (
      <div className="shell">
        <SignInPage />
      </div>
    );
  }
  return (
    <div className="shell">
      <Header />
      <main>
        <Routes>
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:slug" element={<DocsPage />} />
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </main>
    </div>
  );
}
