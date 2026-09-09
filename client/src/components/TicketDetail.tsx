import { useState, type FormEvent } from "react";
import {
  ApiError,
  errorMessage,
  getTicket,
  updateTicketStatus,
} from "../services/api";
import {
  dateTime,
  canRoleTransition,
  isTicketStatus,
  roleLabels,
  statusLabels,
  type AuthSession,
  type Ticket,
  type TicketStatus,
} from "../domain/tickets";
import RequestDocument from "./RequestDocument";
import StatusBadge from "./StatusBadge";

interface Props {
  ticket: Ticket;
  session: AuthSession | null;
  onSessionExpired: () => void;
  onBack: () => void;
  onUpdated: (ticket: Ticket) => void;
}
export default function TicketDetail({
  ticket,
  session,
  onSessionExpired,
  onBack,
  onUpdated,
}: Props) {
  const [nextStatus, setNextStatus] = useState<TicketStatus | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextStatus || busy || !session) return;
    if (!canRoleTransition(session.user.role, ticket.status, nextStatus)) {
      setError("บัญชีนี้ไม่มีสิทธิ์ทำรายการที่เลือก");
      return;
    }
    if (!note.trim()) {
      setError("กรุณาระบุรายละเอียด");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateTicketStatus(
        ticket.id,
        {
          status: nextStatus,
          note: note.trim(),
          version: ticket.version,
        },
        session.token,
      );
      onUpdated(updated);
      setNextStatus("");
      setNote("");
      setNotice("บันทึกสถานะและประวัติเรียบร้อยแล้ว");
    } catch (reason) {
      setError(errorMessage(reason));
      if (reason instanceof ApiError && reason.status === 401) onSessionExpired();
      if (reason instanceof ApiError && reason.status === 409) {
        try {
          onUpdated(await getTicket(ticket.id));
          setNextStatus("");
        } catch {
          /* Preserve the original conflict message; the user can reload. */
        }
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="detail-toolbar no-print">
        <div>
          <button className="text-button" onClick={onBack}>
            ← กลับรายการคำขอ
          </button>
          <h1>{ticket.documentNumber}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <button className="button primary" onClick={() => window.print()}>
          พิมพ์เอกสาร / บันทึก PDF
        </button>
      </section>
      <div className="print-hint no-print">
        พิมพ์ได้ด้วยตนเอง · เลือกกระดาษ A4 และปิดหัว/ท้ายกระดาษของเบราว์เซอร์
        หรือเลือก Save as PDF
      </div>
      <div className="detail-layout">
        <RequestDocument ticket={ticket} />
        <aside className="no-print detail-sidebar">
          <section className="panel">
            <h2>ติดตามการดำเนินงาน</h2>
            <p className="muted small">
              อัปเดตล่าสุด {dateTime(ticket.updatedAt)}
            </p>
            <ol className="timeline">
              {ticket.history.map((event) => (
                <li key={event.id}>
                  <strong>{statusLabels[event.status]}</strong>
                  <span>
                    {event.actor} · {dateTime(event.createdAt)}
                  </span>
                  <p className="preserve-lines">{event.note}</p>
                </li>
              ))}
            </ol>
            {!ticket.history.length && (
              <p className="muted">
                รายการเดิมก่อนเพิ่มระบบประวัติ สถานะปัจจุบัน:{" "}
                {statusLabels[ticket.status]}
              </p>
            )}
          </section>
          <section className="panel">
            <h2>บันทึกผลโดยเจ้าหน้าที่</h2>
            {!session ? (
              <p className="muted">
                เข้าสู่ระบบจากปุ่มด้านบนเพื่อบันทึกผลตามสิทธิ์ของบัญชี
              </p>
            ) : ticket.allowedTransitions.filter(status =>
              canRoleTransition(session.user.role, ticket.status, status),
            ).length === 0 ? (
              <p className="muted">Role {roleLabels[session.user.role]} ไม่มีรายการที่ต้องดำเนินการในสถานะนี้</p>
            ) : (
              <form onSubmit={submit} className="stack">
                <p className="muted small">
                  ผู้บันทึก: <strong>{session.user.displayName}</strong> · {roleLabels[session.user.role]}<br />
                  บันทึกตามผลดำเนินงานจริง การระบุ “อนุมัติแล้ว”
                  หมายถึงได้รับเอกสารลงนามแล้ว
                </p>
                <label>
                  สถานะถัดไป
                  <select
                    required
                    value={nextStatus}
                    disabled={busy}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNextStatus(isTicketStatus(value) ? value : "");
                    }}
                  >
                    <option value="">เลือกการดำเนินงาน</option>
                    {ticket.allowedTransitions
                      .filter(
                        (status) =>
                          canRoleTransition(session.user.role, ticket.status, status) &&
                          (status !== "AWAITING_APPROVAL" || ticket.items.length > 0),
                      )
                      .map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  รายละเอียด / หลักฐานอ้างอิง
                  <textarea
                    required
                    maxLength={2000}
                    rows={4}
                    value={note}
                    disabled={busy}
                    placeholder="เช่น ผลตรวจอุปกรณ์ ผู้ลงนามและวันที่อนุมัติ หรือรายละเอียดรับของ"
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button className="button primary" disabled={busy}>
                  {busy ? "กำลังบันทึก…" : "บันทึกสถานะ"}
                </button>
              </form>
            )}
            {error && (
              <p className="error-box" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success-box" role="status">
                {notice}
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
