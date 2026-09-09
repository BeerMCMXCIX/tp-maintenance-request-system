import { useEffect, useState } from "react";
import { accountRequest, errorMessage } from "../services/api";
import { record } from "../services/parsers";
import { dateTime } from "../domain/tickets";
interface Log { id: number; action: string; actorUsername: string; target: string; details: string; createdAt: string }
function parseLog(raw: unknown): Log {
  const log = record(raw);
  if (typeof log.id !== "number" || ![log.action, log.actorUsername, log.target, log.details, log.createdAt].every(value => typeof value === "string") || !Number.isFinite(Date.parse(String(log.createdAt)))) throw new Error("ข้อมูล Log ไม่ถูกต้อง");
  return log as unknown as Log;
}
export default function AuditLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    void accountRequest("/audit-logs?" + new URLSearchParams({ page: String(page), search: query }), "GET", undefined, abort.signal).then(raw => {
      if (abort.signal.aborted) return;
      const data = record(raw);
      if (!Array.isArray(data.logs) || typeof data.total !== "number") throw new Error("ข้อมูล Log ไม่ถูกต้อง");
      setLogs(data.logs.map(parseLog)); setTotal(data.total);
    }).catch(reason => { if (!abort.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [page, query, revision]);
  function refresh() { setLoading(true); setError(""); setRevision(value => value + 1); }
  return <section className="panel management-panel"><h1>ประวัติการใช้งาน (Log)</h1><p className="muted">Login / Logout การจัดการบัญชีและสิทธิ์ การเปลี่ยนรหัสผ่าน และการดำเนินการคำขอ — ไม่บันทึก Password หรือ Token</p>
    <form className="management-search" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search); refresh(); }}><input aria-label="ค้นหา Log" placeholder="ค้นหาเหตุการณ์ รหัส User หรือ ID เป้าหมาย" maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /><button className="button secondary">ค้นหา / รีเฟรช</button></form>
    {error && <p className="error-box" role="alert">{error}</p>}
    {loading ? <p role="status">กำลังโหลด Log…</p> : !error && <><div className="management-table"><table><thead><tr><th>เวลา</th><th>ผู้ดำเนินการ</th><th>เหตุการณ์</th><th>เป้าหมาย</th><th>รายละเอียด</th></tr></thead><tbody>{logs.map(log => <tr key={log.id}><td>{dateTime(log.createdAt)}</td><td>{log.actorUsername || "ยังไม่เข้าสู่ระบบ"}</td><td>{log.action}</td><td>{log.target}</td><td>{log.details && <details><summary>ดูรายละเอียด</summary><pre>{log.details}</pre></details>}</td></tr>)}</tbody></table></div>{!logs.length && <p>ยังไม่มี Log ที่ตรงกับการค้นหา</p>}</>}
    <div className="management-pagination"><button className="button secondary" disabled={loading || page <= 1} onClick={() => { setPage(page - 1); refresh(); }}>ก่อนหน้า</button><span>หน้า {page} · {total} รายการ</span><button className="button secondary" disabled={loading || page * 30 >= total} onClick={() => { setPage(page + 1); refresh(); }}>ถัดไป</button></div>
  </section>;
}
