import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, errorMessage, getMe, setAccessToken } from "../services/api";
import { parseSession } from "../services/parsers";
import type { AuthSession } from "../domain/tickets";

const SESSION_KEY = "tp_auth_session";
function readSession(): AuthSession | null {
  try {
    // Previous releases persisted credentials across browser sessions.
    localStorage.removeItem(SESSION_KEY);
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = parseSession(JSON.parse(raw));
    return Date.parse(session.expiresAt) > Date.now() ? session : null;
  } catch { return null; }
}
export function useAuthSession() {
  const [state, setState] = useState(() => ({ session: readSession(), verified: false, error: "" }));
  const revision = useRef(0);
  const setSession = useCallback((session: AuthSession | null) => {
    revision.current += 1;
    setAccessToken(session?.token ?? null);
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* Authentication remains available in memory. */ }
    setState({ session, verified: !!session, error: "" });
  }, []);
  const verified = state.verified;
  useEffect(() => {
    const saved = state.session;
    if (!saved || verified) return;
    const startedAt = revision.current;
    const abort = new AbortController();
    void getMe(saved.token, abort.signal).then(user => {
      if (!abort.signal.aborted && revision.current === startedAt) {
        setSession({ ...saved, user });
      }
    }).catch(error => {
      if (abort.signal.aborted || revision.current !== startedAt) return;
      if (error instanceof ApiError && error.status === 401) setSession(null);
      else setState(previous => ({ ...previous, error: errorMessage(error) }));
    });
    return () => abort.abort();
  }, [state.session, verified, setSession]);
  useEffect(() => {
    if (!state.session) return;
    const timer = window.setTimeout(() => setSession(null),
      Math.max(0, Math.min(2147483647, Date.parse(state.session.expiresAt) - Date.now())));
    return () => window.clearTimeout(timer);
  }, [state.session, setSession]);
  useEffect(() => {
    const expire = () => setSession(null);
    window.addEventListener("auth-expired", expire);
    return () => window.removeEventListener("auth-expired", expire);
  }, [setSession]);
  return { ...state, setSession };
}
