import { useState } from "react";
import { ApiError, errorMessage, logout } from "../services/api";
import { roleLabels, type AuthSession } from "../domain/tickets";

interface Props {
  session: AuthSession;
  onLogout: () => void;
}
export default function AuthAccess({ session, onLogout }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    if (busy) return;
    setBusy(true); setError("");
    try { await logout(session.token); onLogout(); }
    catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onLogout();
      else setError(errorMessage(reason));
    } finally { setBusy(false); }
  }
  return <div className="signed-in-user">
    <span><strong>{session.user.displayName}</strong><small>{roleLabels[session.user.role]}</small></span>
    <button className="button secondary" disabled={busy} onClick={() => void signOut()}>{busy ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button>
    {error && <p className="error-box" role="alert">{error}</p>}
  </div>;
}
