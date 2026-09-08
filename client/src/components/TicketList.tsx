import { useState, type FormEvent } from "react";
import {
  dateTime,
  isTicketStatus,
  statusLabels,
  type Ticket,
  type PaginationData,
  type TicketQuery,
} from "../domain/tickets";
import StatusBadge from "./StatusBadge";

interface Props {
  tickets: Ticket[];
  pagination: PaginationData | null;
  query: TicketQuery;
  onQuery: (query: TicketQuery) => void;
  onOpen: (id: number) => void;
  isLoading: boolean;
}
export default function TicketList({
  tickets,
  pagination,
  query,
  onQuery,
  onOpen,
  isLoading,
}: Props) {
  const [search, setSearch] = useState(query.search);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onQuery({ ...query, search: search.trim(), page: 1 });
  }
  return (
    <section className="panel list-panel" aria-busy={isLoading}>
      <div className="section-heading">
        <div>
          <h2>รายการคำขอ</h2>
          <p className="muted small">ค้นหา ติดตาม และพิมพ์เอกสารของคุณ</p>
        </div>
        <span className="count-label">
          {pagination ? pagination.total + " รายการที่พบ" : "กำลังโหลด"}
        </span>
      </div>
      <div className="list-filters">
        <form className="search-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="request-search">
            ค้นหาคำขอ
          </label>
          <input
            id="request-search"
            type="search"
            value={search}
            maxLength={200}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="เลขเอกสาร หัวข้อ ผู้ขอ หรือแผนก…"
          />
          <button className="button secondary">ค้นหา</button>
        </form>
        <label>
          <span className="sr-only">กรองสถานะ</span>
          <select
            value={query.status}
            onChange={(e) =>
              onQuery({
                ...query,
                status: isTicketStatus(e.target.value) ? e.target.value : "",
                page: 1,
              })
            }
          >
            <option value="">ทุกสถานะ</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">เรียงลำดับ</span>
          <select
            value={query.sort}
            onChange={(e) =>
              onQuery({
                ...query,
                sort:
                  e.target.value === "oldest"
                    ? "oldest"
                    : e.target.value === "title"
                      ? "title"
                      : "newest",
                page: 1,
              })
            }
          >
            <option value="newest">ใหม่ล่าสุด</option>
            <option value="oldest">เก่าที่สุด</option>
            <option value="title">ตามหัวข้อ</option>
          </select>
        </label>
      </div>
      {isLoading ? (
        <div className="empty-state" role="status">
          กำลังโหลดรายการคำขอ…
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ▤
          </span>
          <h3>
            {query.search || query.status
              ? "ไม่พบคำขอที่ตรงกับการค้นหา"
              : "เริ่มต้นคำขอแรกของคุณ"}
          </h3>
          <p>
            {query.search || query.status
              ? "ลองเปลี่ยนคำค้นหรือเลือกทุกสถานะ"
              : "กด “แจ้งซ่อม / ขออุปกรณ์” เพื่อสร้างคำขอและออกเอกสาร"}
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="ticket-table">
            <thead>
              <tr>
                <th scope="col">เลขเอกสาร / คำขอ</th>
                <th scope="col">ผู้ขอ / แผนก</th>
                <th scope="col">วันที่แจ้ง</th>
                <th scope="col">สถานะ</th>
                <th scope="col">
                  <span className="sr-only">การดำเนินการ</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <button
                      className="document-link"
                      onClick={() => onOpen(ticket.id)}
                    >
                      {ticket.documentNumber}
                    </button>
                    <p className="ticket-title">{ticket.title}</p>
                    {ticket.priority === "URGENT" && (
                      <span className="urgent-label">เร่งด่วน</span>
                    )}
                  </td>
                  <td>
                    <strong>{ticket.requesterName || "ข้อมูลเดิม"}</strong>
                    <p className="muted small">
                      {ticket.department || "ไม่ระบุแผนก"}
                    </p>
                  </td>
                  <td className="date-cell">{dateTime(ticket.createdAt)}</td>
                  <td>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td>
                    <button
                      className="button secondary compact"
                      onClick={() => onOpen(ticket.id)}
                      aria-label={"ดูและพิมพ์ " + ticket.documentNumber}
                    >
                      ดู / พิมพ์ ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination && (
        <div className="pagination">
          <span className="muted small">
            หน้า {pagination.page} จาก {pagination.totalPages} ·{" "}
            {pagination.total} รายการ
          </span>
          <div>
            <button
              className="button secondary compact"
              disabled={isLoading || pagination.page <= 1}
              onClick={() => onQuery({ ...query, page: pagination.page - 1 })}
            >
              ← ก่อนหน้า
            </button>
            <button
              className="button secondary compact"
              disabled={isLoading || pagination.page >= pagination.totalPages}
              onClick={() => onQuery({ ...query, page: pagination.page + 1 })}
            >
              ถัดไป →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
