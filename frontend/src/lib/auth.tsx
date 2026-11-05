import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Status = "checking" | "signedIn" | "signedOut";

type Auth = {
  status: Status;
  /** Resolves to an error sentence for the form, or null once signed in. */
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** The server said the session is over: back to the sign-in form. */
  sessionEnded: () => void;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    fetch("/api/me")
      .then((response) => setStatus(response.ok ? "signedIn" : "signedOut"))
      .catch(() => setStatus("signedOut"));
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        setStatus("signedIn");
        return null;
      }
      return response.status === 401
        ? "That username or password isn't right."
        : "Sign-in isn't working right now. Try again shortly.";
    } catch {
      return "Could not reach the server. Check your connection and try again.";
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
    setStatus("signedOut");
  }, []);

  const sessionEnded = useCallback(() => setStatus("signedOut"), []);

  const value = useMemo(
    () => ({ status, signIn, signOut, sessionEnded }),
    [status, signIn, signOut, sessionEnded],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth outside AuthProvider");
  return auth;
}
