import { useEffect, useState } from "react";
import { errorMessage, getTicket, getTickets } from "./services/api";
import type { Ticket, TicketPage, TicketQuery } from "./domain/tickets";
import TicketForm from "./components/TicketForm";
import TicketList from "./components/TicketList";
import DashboardStats from "./components/DashboardStats";
import TicketDetail from "./components/TicketDetail";
import StaffAccess from "./components/StaffAccess";

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "detail"; id: number };

function readView(): View {
  if (window.location.hash === "#new") return { kind: "create" };
  const id = /^#tickets\/(\d+)$/.exec(window.location.hash)?.[1];
  if (id && Number.isSafeInteger(Number(id)) && Number(id) > 0) {
    return { kind: "detail", id: Number(id) };
  }
  return { kind: "list" };
}

function go(hash: string) {
  window.location.hash = hash;
}

export default function App() {
  const [view, setView] = useState<View>(readView);
  const [query, setQuery] = useState<TicketQuery>({
    page: 1,
    search: "",
    status: "",
    sort: "newest",
  });
  const [page, setPage] = useState<TicketPage | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState("");
  const [staffKey, setStaffKey] = useState("");

  useEffect(() => {
    function navigate() {
      setView(readView());
      setError("");
      setLoading(true);
    }
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    if (view.kind === "create") return;
    const abort = new AbortController();

    async function load() {
      try {
        if (view.kind === "detail") {
          const result = await getTicket(view.id, abort.signal);
          if (!abort.signal.aborted) setTicket(result);
        } else {
          const result = await getTickets(query, abort.signal);
          if (!abort.signal.aborted) setPage(result);
        }
      } catch (reason) {
        if (!abort.signal.aborted) setError(errorMessage(reason));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => abort.abort();
  }, [view, query, refresh]);

  function created(createdTicket: Ticket) {
    setTicket(createdTicket);
    setNotice("บันทึกคำขอเรียบร้อยแล้ว เลขเอกสาร " + createdTicket.documentNumber);
    go("tickets/" + createdTicket.id);
  }

  function changeQuery(nextQuery: TicketQuery) {
    setLoading(true);
    setError("");
    setQuery(nextQuery);
  }

  function retry() {
    setLoading(true);
    setError("");
    setRefresh(value => value + 1);
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link no-print"
        href="#main-content"
        onClick={event => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        ข้ามไปเนื้อหา
      </a>
      <header className="topbar no-print">
        <div className="topbar-inner">
          <a href="#" className="brand">
            <span className="brand-mark">TP</span>
            <span>IT Service<small>ระบบแจ้งซ่อมและขออุปกรณ์</small></span>
          </a>
          <div className="header-actions">
            {staffKey && <span className="staff-indicator">โหมดเจ้าหน้าที่</span>}
            <StaffAccess
              active={Boolean(staffKey)}
              onLogin={setStaffKey}
              onLogout={() => setStaffKey("")}
            />
          </div>
        </div>
      </header>
      <main id="main-content" className="main-container" tabIndex={-1}>
        {notice && (
          <div className="success-box notice no-print" role="status">
            <span>{notice}</span>
            <button className="text-button" onClick={() => setNotice("")} aria-label="ปิดข้อความ">
              ปิด
            </button>
          </div>
        )}
        {view.kind === "list" && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">TP · IT SERVICE DESK</p>
                <h1>แจ้งปัญหา IT ง่ายขึ้น<br /><span>เอกสารพร้อม ไม่ต้องเดินมาที่ IT</span></h1>
                <p className="muted">แจ้งซ่อม ขออุปกรณ์ ติดตามสถานะ และพิมพ์เอกสารได้ในที่เดียว</p>
              </div>
              <button className="button primary" onClick={() => go("new")}>
                ＋ แจ้งซ่อม / ขออุปกรณ์
              </button>
            </section>
            <div className="workflow-strip">
              <span><b>01</b> กรอกคำขอ</span><i aria-hidden="true">→</i>
              <span><b>02</b> พิมพ์เอกสาร</span><i aria-hidden="true">→</i>
              <span><b>03</b> ส่งลงนามอนุมัติ</span><i aria-hidden="true">→</i>
              <span><b>04</b> ติดตาม / รับอุปกรณ์</span>
            </div>
            <DashboardStats stats={error ? null : page?.stats ?? null} />
          </>
        )}
        {error && (
          <div className="error-box no-print" role="alert">
            {error} <button className="text-button" onClick={retry}>ลองใหม่</button>
            {view.kind === "detail" && (
              <button className="text-button" onClick={() => go("")}>กลับรายการ</button>
            )}
          </div>
        )}
        {view.kind === "list" && !error && (
          <TicketList
            tickets={page?.data ?? []}
            pagination={page?.pagination ?? null}
            query={query}
            isLoading={loading}
            onQuery={changeQuery}
            onOpen={id => go("tickets/" + id)}
          />
        )}
        {view.kind === "create" && (
          <TicketForm onSuccess={created} onCancel={() => go("")} />
        )}
        {view.kind === "detail" && !error && (
          loading || ticket?.id !== view.id
            ? <div className="panel empty-state" role="status">กำลังโหลดเอกสาร…</div>
            : <TicketDetail
                key={ticket.id}
                ticket={ticket}
                staffKey={staffKey}
                onBack={() => go("")}
                onUpdated={setTicket}
              />
        )}
      </main>
      <footer className="app-footer no-print">
        TP IT Service · ระบบเอกสารภายในบริษัท
        <span>พบปัญหาการใช้งาน ติดต่อแผนก IT</span>
      </footer>
    </div>
  );
}
