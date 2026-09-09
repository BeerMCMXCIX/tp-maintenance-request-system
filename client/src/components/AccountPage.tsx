import { useState, type FormEvent } from "react";
import type { AuthUser } from "../domain/tickets";
import { accountRequest, errorMessage } from "../services/api";

export default function AccountPage({ user, onChanged }: { user: AuthUser; onChanged: () => void }) {
  const [currentPassword, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) { setError("ยืนยัน Password ไม่ตรงกัน"); return; }
    setBusy(true); setError("");
    try { await accountRequest("/auth/password", "PUT", { currentPassword, password }); onChanged(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }
  return <section className="panel account-card"><h1>บัญชีของฉัน</h1>
    <p>{user.displayName} · {user.username}</p><p className="muted">แผนก {user.department || "—"} · สาขา {user.branch || "—"}</p>
    <form onSubmit={submit} className="account-form"><h2>เปลี่ยน Password</h2>
      <label>Password ปัจจุบัน<input type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={e => setCurrent(e.target.value)} /></label>
      <label>Password ใหม่<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label>ยืนยัน Password ใหม่<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      <p className="muted small">อย่างน้อย 8 ตัวอักษร เมื่อเปลี่ยนแล้วจะออกจากระบบทุกอุปกรณ์ กรุณา Login ใหม่</p>
      {error && <p className="error-box" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? "กำลังบันทึก…" : "เปลี่ยน Password"}</button>
    </form></section>;
}
