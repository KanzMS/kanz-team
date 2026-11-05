import type { ReactNode } from "react";
import type { ApiError } from "./lib/api";

export function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  );
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="state-card">
      <Icon name={icon} />
      <h2 className="state-title">{title}</h2>
      <p className="state-body">{children}</p>
    </div>
  );
}

export function ErrorState({ error, retry }: { error: ApiError; retry: () => void }) {
  return (
    <div className="state-card is-error" role="alert">
      <Icon name="error" />
      <h2 className="state-title">This didn't load</h2>
      <p className="state-body">{error.message}</p>
      <button type="button" className="pill" onClick={retry}>
        <Icon name="refresh" />
        Try again
      </button>
    </div>
  );
}
