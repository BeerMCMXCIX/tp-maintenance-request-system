import { useState, type FormEvent } from "react";
import { errorMessage, login, logout } from "../services/api";
import { roleLabels, type AuthSession } from "../domain/tickets";

interface Props {
  session: AuthSession | null;
  onLogin: (session: AuthSession) => void;
  onLogout: () => void;
}

export default function AuthAccess({ session, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const nextSession = await login(username.trim(), password);
      onLogin(nextSession);
      setUsername("");
      setPassword("");
      setOpen(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (session) {
      try {
        await logout(session.token);
      } catch {
        /* Clear the local session even if it already expired. */
      }
    }
    onLogout();
  }

  if (session) {
    return (
      <div className="signed-in-user">
        <span>
          <strong>{session.user.displayName}</strong>
          <small>{roleLabels[session.user.role]}</small>
        </span>
        <button className="button secondary" onClick={signOut}>
          ออกจากระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="staff-access">
      <button
        className="button secondary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        เข้าสู่ระบบ
      </button>
      {open && (
        <form className="staff-popover panel" onSubmit={submit}>
          <h2>เข้าสู่ระบบเจ้าหน้าที่</h2>
          <p className="muted small">
            สำหรับเจ้าหน้าที่ IT ผู้จัดซื้อ และผู้ดูแลระบบ
          </p>
          <label>
            Username
            <input
              required
              maxLength={50}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              maxLength={128}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      )}
    </div>
  );
}
