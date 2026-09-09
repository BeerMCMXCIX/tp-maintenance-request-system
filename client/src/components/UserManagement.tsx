import { useEffect, useState, type FormEvent } from "react";
import { hasPermission, permissionLabels, roleLabels, type AuthUser, type Permission, type UserRole } from "../domain/tickets";
import { accountRequest, errorMessage } from "../services/api";
import { parseUser, record } from "../services/parsers";

type Editor = { mode: "create" | "profile" | "permissions" | "password"; user: AuthUser | null };
export default function UserManagement({ actor }: { actor: AuthUser }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const manageUsers = hasPermission(actor, "MANAGE_USERS");
  const managePermissions = hasPermission(actor, "MANAGE_PERMISSIONS");
  useEffect(() => {
    const abort = new AbortController();
    void accountRequest("/users?" + new URLSearchParams({ page: String(page), search: query }), "GET", undefined, abort.signal).then(raw => {
      if (abort.signal.aborted) return;
      const data = record(raw);
      if (!Array.isArray(data.users) || typeof data.total !== "number") throw new Error("ข้อมูลผู้ใช้ไม่ถูกต้อง");
      setUsers(data.users.map(parseUser)); setTotal(data.total);
    }).catch(reason => { if (!abort.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [page, query, revision]);
  function reload() { setLoading(true); setError(""); setRevision(value => value + 1); }
  async function remove(user: AuthUser) {
    if (busy || !window.confirm("ลบบัญชี " + user.username + "? บัญชีจะใช้งานไม่ได้ทันที แต่ประวัติยังคงอยู่")) return;
    setBusy(true); setError("");
    try { await accountRequest("/users/" + user.id, "DELETE"); setNotice("ลบบัญชีแล้ว"); if (users.length === 1 && page > 1) setPage(page - 1); reload(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }
  return <section className="panel management-panel">
    <div className="management-heading"><div><h1>จัดการผู้ใช้และสิทธิ์</h1><p className="muted">สร้างบัญชีโดยผู้ได้รับสิทธิ์เท่านั้น ไม่มีสมัครสมาชิก</p></div>
      {manageUsers && <button className="button primary" onClick={() => setEditor({ mode: "create", user: null })}>＋ สร้าง User</button>}</div>
    <form className="management-search" onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search); reload(); }}>
      <input aria-label="ค้นหาผู้ใช้" placeholder="ค้นหารหัส User ชื่อ แผนก สาขา" value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /><button className="button secondary">ค้นหา</button>
    </form>
    {error && <p className="error-box" role="alert">{error} <button className="text-button" onClick={reload}>ลองใหม่</button></p>}
    {notice && <p className="success-box" role="status">{notice}</p>}
    {loading ? <p role="status">กำลังโหลดผู้ใช้…</p> : !error && <>
      <div className="management-table"><table><thead><tr><th>รหัส User / ชื่อ</th><th>แผนก / สาขา</th><th>บทบาท / สิทธิ์</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>
        {users.map(user => <tr key={user.id}><td><strong>{user.username}</strong><br />{user.displayName}</td><td>{user.department || "—"}<br />{user.branch || "—"}</td>
          <td>{roleLabels[user.role]}<small className="permission-summary">{user.permissions.map(p => permissionLabels[p]).join(", ") || "ไม่มีสิทธิ์จัดการเพิ่มเติม"}</small></td><td>{user.active ? "ใช้งาน" : "ระงับ"}</td>
          <td><div className="row-actions">
            {manageUsers && <><button className="button secondary" disabled={busy} onClick={() => setEditor({ mode: "profile", user })}>แก้ไข</button><button className="button secondary" disabled={busy} onClick={() => setEditor({ mode: "password", user })}>รีเซ็ต Password</button></>}
            {managePermissions && user.role !== "ADMIN" && user.id !== actor.id && <button className="button secondary" disabled={busy} onClick={() => setEditor({ mode: "permissions", user })}>สิทธิ์</button>}
            {manageUsers && user.id !== actor.id && <button className="button secondary danger-text" disabled={busy} onClick={() => void remove(user)}>ลบ</button>}
          </div></td></tr>)}
      </tbody></table></div>
      {!users.length && <p>ไม่พบผู้ใช้</p>}
      <div className="management-pagination"><button className="button secondary" disabled={page <= 1} onClick={() => { setPage(page - 1); setLoading(true); }}>ก่อนหน้า</button><span>หน้า {page} · {total} บัญชี</span><button className="button secondary" disabled={page * 20 >= total} onClick={() => { setPage(page + 1); setLoading(true); }}>ถัดไป</button></div>
    </>}
    {editor && <UserEditor key={editor.mode + ":" + (editor.user?.id ?? "new")} editor={editor} actor={actor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setNotice("บันทึกแล้ว หากแก้บัญชีเดิม ผู้ใช้นั้นต้อง Login ใหม่"); reload(); }} />}
  </section>;
}

function UserEditor({ editor, actor, onClose, onSaved }: { editor: Editor; actor: AuthUser; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState(editor.user?.username ?? "");
  const [displayName, setName] = useState(editor.user?.displayName ?? "");
  const [department, setDepartment] = useState(editor.user?.department ?? "");
  const [branch, setBranch] = useState(editor.user?.branch ?? "");
  const [role, setRole] = useState<UserRole>(editor.user?.role ?? "USER");
  const [active, setActive] = useState(editor.user?.active ?? true);
  const [permissions, setPermissions] = useState<Permission[]>(editor.user?.permissions ?? []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profile = editor.mode === "create" || editor.mode === "profile";
  const passwordMode = editor.mode === "create" || editor.mode === "password";
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    if (passwordMode && password !== confirm) { setError("ยืนยัน Password ไม่ตรงกัน"); return; }
    setBusy(true); setError("");
    const path = "/users/" + editor.user?.id;
    try {
      if (editor.mode === "create") await accountRequest("/users", "POST", { username, displayName, department, branch, role, password });
      else if (editor.mode === "profile") await accountRequest(path, "PUT", { username, displayName, department, branch, role, active });
      else if (editor.mode === "permissions") await accountRequest(path + "/permissions", "PUT", { permissions });
      else await accountRequest(path + "/password", "PUT", { password });
      if (editor.user?.id === actor.id) window.dispatchEvent(new Event("auth-expired"));
      else onSaved();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }
  return <div className="editor-overlay"><section className="panel user-editor" role="dialog" aria-modal="true" aria-labelledby="user-editor-title"><form onSubmit={submit}>
    <h2 id="user-editor-title">{({ create: "สร้าง User", profile: "แก้ไขผู้ใช้", permissions: "จัดการสิทธิ์", password: "รีเซ็ต Password" })[editor.mode]} {editor.user?.username}</h2>
    <fieldset disabled={busy}>
      {profile && <>
        <label>รหัส User (ใช้เข้าระบบ)<input autoFocus required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._\-]+" value={username} onChange={e => setUsername(e.target.value)} /></label>
        <label>ชื่อผู้ใช้งาน<input required maxLength={100} value={displayName} onChange={e => setName(e.target.value)} /></label>
        <label>แผนก<input required maxLength={100} value={department} onChange={e => setDepartment(e.target.value)} /></label>
        <label>สาขา<input required maxLength={100} value={branch} onChange={e => setBranch(e.target.value)} /></label>
        <label>บทบาท<select value={role} disabled={editor.mode === "profile" && !hasPermission(actor, "MANAGE_PERMISSIONS")} onChange={e => setRole(e.target.value as UserRole)}>{Object.entries(roleLabels).filter(([value]) => actor.role === "ADMIN" || value !== "ADMIN").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {editor.mode === "profile" && <label className="check-label"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> เปิดใช้งานบัญชี</label>}
      </>}
      {passwordMode && <><label>Password ใหม่<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label><label>ยืนยัน Password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label></>}
      {editor.mode === "permissions" && <><p className="muted">มอบได้เฉพาะสิทธิ์ที่คุณมี การเปลี่ยนสิทธิ์จะยกเลิก session ของผู้ใช้</p>{(Object.keys(permissionLabels) as Permission[]).map(permission => <label className="check-label" key={permission}><input type="checkbox" disabled={!hasPermission(actor, permission)} checked={permissions.includes(permission)} onChange={e => setPermissions(e.target.checked ? [...permissions, permission] : permissions.filter(value => value !== permission))} />{permissionLabels[permission]}</label>)}</>}
    </fieldset>
    {error && <p className="error-box" role="alert">{error}</p>}
    <div className="row-actions"><button className="button primary" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button><button type="button" className="button secondary" disabled={busy} onClick={onClose}>ยกเลิก</button></div>
  </form></section></div>;
}
