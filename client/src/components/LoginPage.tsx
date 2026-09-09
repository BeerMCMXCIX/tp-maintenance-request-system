import { useState, type FormEvent } from "react";
import { errorMessage, login } from "../services/api";
import type { AuthSession } from "../domain/tickets";

export default function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { onLogin(await login(username.trim(), password)); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }
  return <main className="login-layout">
    <section className="login-intro"><span className="brand-mark">TP</span><p className="eyebrow">IT SERVICE DESK</p><h1>ระบบแจ้งซ่อม<br />และขออุปกรณ์ IT</h1><p>จัดการคำขอ เอกสาร และติดตามการดำเนินงานภายในบริษัท</p></section>
    <form className="panel login-card" onSubmit={submit}>
      <h2>เข้าสู่ระบบ</h2><p className="muted">ใช้บัญชีที่ผู้ดูแลระบบหรือผู้มีสิทธิ์สร้างให้เท่านั้น</p>
      <label>รหัส User<input autoFocus required autoComplete="username" minLength={3} maxLength={50} value={username} onChange={event => setUsername(event.target.value)} /></label>
      <label>Password<input type="password" required autoComplete="current-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p className="error-box" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      <p className="muted small">ไม่มีการสมัครสมาชิก หากยังไม่มีบัญชีหรือลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ</p>
    </form>
  </main>;
}
