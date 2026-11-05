import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A fetch to our API. The session cookie goes along by itself; a 401 ends the session here too. */
export function useApiFetch() {
  const { sessionEnded } = useAuth();
  return useCallback(
    async (path: string): Promise<Response> => {
      let response: Response;
      try {
        response = await fetch(path);
      } catch {
        throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
      }
      if (response.status === 401) sessionEnded();
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiError(response.status, body?.detail ?? "Something went wrong. Try again.");
      }
      return response;
    },
    [sessionEnded],
  );
}

export type Loadable<T> =
  | { status: "loading"; retry: () => void }
  | { status: "error"; error: ApiError; retry: () => void }
  | { status: "ready"; data: T; retry: () => void };

export function useApi<T>(path: string): Loadable<T> {
  const apiFetch = useApiFetch();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; error: ApiError } | { status: "ready"; data: T }
  >({ status: "loading" });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let stale = false;
    setState({ status: "loading" });
    apiFetch(path)
      .then((response) => response.json())
      .then((data: T) => {
        if (!stale) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (stale) return;
        const apiError =
          error instanceof ApiError ? error : new ApiError(0, "Something went wrong. Try again.");
        setState({ status: "error", error: apiError });
      });
    return () => {
      stale = true;
    };
  }, [apiFetch, path, attempt]);

  return { ...state, retry };
}
