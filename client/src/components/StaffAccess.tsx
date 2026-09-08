import { useState, type FormEvent } from "react";
import { errorMessage, verifyStaff } from "../services/api";

interface Props {
  active: boolean;
  onLogin: (key: string) => void;
  onLogout: () => void;
}
export default function StaffAccess({ active, onLogin, onLogout }: Props) {
  const [open, setOpen] = useState(false),
    [key, setKey] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyStaff(key);
      onLogin(key);
      setKey("");
      setOpen(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  if (active)
    return (
      <button className="button secondary" onClick={onLogout}>
        ออกจากโหมดเจ้าหน้าที่
      </button>
    );
  return (
    <div className="staff-access">
      <button
        className="button secondary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        สำหรับเจ้าหน้าที่
      </button>
      {open && (
        <form className="staff-popover panel" onSubmit={submit}>
          <h2>บันทึกผลการดำเนินงาน</h2>
          <p className="muted small">
            ใช้รหัสที่ผู้ดูแลระบบกำหนดสำหรับเจ้าหน้าที่ IT / จัดซื้อ
          </p>
          <label>
            รหัสเจ้าหน้าที่
            <input
              type="password"
              required
              value={key}
              autoComplete="current-password"
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "กำลังตรวจสอบ…" : "เข้าใช้งาน"}
          </button>
        </form>
      )}
    </div>
  );
}
