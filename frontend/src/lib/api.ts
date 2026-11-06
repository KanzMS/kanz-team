import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A URL under the site's base path, which is a subfolder on GitHub Pages. */
export function siteUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

/** Fetches a file the build generated from `content/`. */
export async function fetchContent(path: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(siteUrl(`content/${path}`));
  } catch {
    throw new ApiError(0, "Could not reach the site. Check your connection and try again.");
  }
  if (response.status === 404) throw new ApiError(404, "This isn't on the site.");
  if (!response.ok) throw new ApiError(response.status, "Something went wrong. Try again.");
  return response;
}

export type Loadable<T> =
  | { status: "loading"; retry: () => void }
  | { status: "error"; error: ApiError; retry: () => void }
  | { status: "ready"; data: T; retry: () => void };

export function useApi<T>(path: string): Loadable<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; error: ApiError } | { status: "ready"; data: T }
  >({ status: "loading" });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let stale = false;
    setState({ status: "loading" });
    fetchContent(path)
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
  }, [path, attempt]);

  return { ...state, retry };
}
