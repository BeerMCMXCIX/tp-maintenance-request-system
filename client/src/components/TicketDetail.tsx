import { useState, type FormEvent } from "react";
import {
  ApiError,
  errorMessage,
  getTicket,
  updateTicketStatus,
} from "../services/api";
import {
  dateTime,
  isTicketStatus,
  statusLabels,
  type Ticket,
  type TicketStatus,
} from "../domain/tickets";
import RequestDocument from "./RequestDocument";
import StatusBadge from "./StatusBadge";

interface Props {
  ticket: Ticket;
  staffKey: string;
  onBack: () => void;
  onUpdated: (ticket: Ticket) => void;
}
export default function TicketDetail({
  ticket,
  staffKey,
  onBack,
  onUpdated,
}: Props) {
  const [nextStatus, setNextStatus] = useState<TicketStatus | "">("");
  const [actor, setActor] = useState(""),
    [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextStatus || busy) return;
    if (!actor.trim() || !note.trim()) {
      setError("กรุณาระบุผู้บันทึกและรายละเอียด");
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
          actor: actor.trim(),
          note: note.trim(),
          version: ticket.version,
        },
        staffKey,
      );
      onUpdated(updated);
      setNextStatus("");
      setNote("");
      setNotice("บันทึกสถานะและประวัติเรียบร้อยแล้ว");
    } catch (reason) {
      setError(errorMessage(reason));
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
            {!staffKey ? (
              <p className="muted">
                เข้าโหมดเจ้าหน้าที่จากปุ่มด้านบนเพื่อบันทึกผลตรวจซ่อม ผลลงนาม
                หรือสถานะจัดซื้อ
              </p>
            ) : ticket.allowedTransitions.length === 0 ? (
              <p className="muted">คำขอนี้สิ้นสุดการดำเนินงานแล้ว</p>
            ) : (
              <form onSubmit={submit} className="stack">
                <p className="muted small">
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
                          status !== "AWAITING_APPROVAL" ||
                          ticket.items.length > 0,
                      )
                      .map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  ชื่อผู้บันทึก
                  <input
                    required
                    maxLength={100}
                    value={actor}
                    disabled={busy}
                    onChange={(e) => setActor(e.target.value)}
                  />
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
