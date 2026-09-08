import { useRef, useState, type FormEvent } from "react";
import { createTicket, errorMessage } from "../services/api";
import { estimatedTotal, money, type Ticket } from "../domain/tickets";

interface Props {
  onSuccess: (ticket: Ticket) => void;
  onCancel: () => void;
}
interface ItemDraft {
  key: number;
  name: string;
  quantity: string;
  unit: string;
  price: string;
}
export default function TicketForm({ onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<ItemDraft[]>([]);
  const nextKey = useRef(1);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const parsedItems = items.map((item) => ({
    name: item.name.trim(),
    quantity: Number(item.quantity),
    unit: item.unit.trim(),
    estimatedUnitPrice: item.price === "" ? null : Number(item.price),
  }));
  function updateItem(
    key: number,
    field: keyof Omit<ItemDraft, "key">,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    const required = [
      "title",
      "description",
      "requesterName",
      "department",
      "contact",
      "location",
    ];
    if (
      required.some((name) => !field(name)) ||
      parsedItems.some((item) => !item.name || !item.unit)
    ) {
      setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ ไม่ใช้เฉพาะช่องว่าง");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const ticket = await createTicket({
        title: field("title"),
        description: field("description"),
        requesterName: field("requesterName"),
        department: field("department"),
        contact: field("contact"),
        location: field("location"),
        assetCode: field("assetCode"),
        priority: field("priority") === "URGENT" ? "URGENT" : "NORMAL",
        items: parsedItems,
      });
      onSuccess(ticket);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel form-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NEW REQUEST</p>
          <h1>แจ้งซ่อม / ขออุปกรณ์ IT</h1>
          <p className="muted">
            กรอกข้อมูลครั้งเดียว แล้วพิมพ์เอกสารส่งจัดซื้อได้ด้วยตนเอง
          </p>
        </div>
        <button className="button secondary" onClick={onCancel} disabled={busy}>
          กลับรายการ
        </button>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <legend>01 · ข้อมูลผู้ขอ</legend>
          <div className="form-grid">
            <label>
              ชื่อ–นามสกุลผู้ขอ <span className="required">*</span>
              <input
                name="requesterName"
                required
                maxLength={100}
                autoComplete="name"
                placeholder="ชื่อผู้แจ้งปัญหา"
              />
            </label>
            <label>
              แผนก <span className="required">*</span>
              <input
                name="department"
                required
                maxLength={100}
                placeholder="เช่น บัญชี, คลังสินค้า, ฝ่ายขาย"
              />
            </label>
            <label>
              เบอร์โทร / ช่องทางติดต่อ <span className="required">*</span>
              <input
                name="contact"
                required
                maxLength={100}
                placeholder="เบอร์ภายใน หรืออีเมล"
              />
            </label>
            <label>
              สถานที่ใช้งาน <span className="required">*</span>
              <input
                name="location"
                required
                maxLength={150}
                placeholder="อาคาร ชั้น หรือจุดที่ใช้งาน"
              />
            </label>
          </div>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>02 · รายละเอียดปัญหา</legend>
          <div className="form-grid">
            <label className="full-width">
              หัวข้อ <span className="required">*</span>
              <input
                name="title"
                required
                maxLength={100}
                placeholder="เช่น จอคอมพิวเตอร์ไม่ติด ต้องการตรวจสอบหรือเปลี่ยน"
              />
            </label>
            <label>
              รหัสทรัพย์สิน / Serial number
              <input name="assetCode" maxLength={100} placeholder="หากทราบ" />
            </label>
            <label>
              ความเร่งด่วน
              <select name="priority" defaultValue="NORMAL">
                <option value="NORMAL">ปกติ</option>
                <option value="URGENT">เร่งด่วน — กระทบการทำงาน</option>
              </select>
            </label>
            <label className="full-width">
              อาการเสีย / เหตุผลที่ขออุปกรณ์ <span className="required">*</span>
              <textarea
                name="description"
                required
                rows={4}
                maxLength={3000}
                placeholder="ระบุปัญหา ผลกระทบ และสิ่งที่ต้องการให้ช่วยเหลือ"
              />
            </label>
          </div>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>03 · รายการอุปกรณ์ที่ขอ</legend>
          <p className="muted">
            สำหรับคำขอจัดซื้อ ให้ระบุรายการและจำนวน ราคาประมาณการเว้นว่างได้
            หากแจ้งตรวจซ่อมอย่างเดียวไม่ต้องเพิ่มรายการ
          </p>
          <div className="item-editor">
            {items.map((item, index) => (
              <div className="item-row" key={item.key}>
                <label>
                  รายการที่ {index + 1}
                  <input
                    required
                    maxLength={200}
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.key, "name", e.target.value)
                    }
                    placeholder="ชื่อ / รุ่น / คุณสมบัติ"
                  />
                </label>
                <label>
                  จำนวน
                  <input
                    required
                    type="number"
                    min={1}
                    max={9999}
                    step={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.key, "quantity", e.target.value)
                    }
                  />
                </label>
                <label>
                  หน่วย
                  <input
                    required
                    maxLength={30}
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.key, "unit", e.target.value)
                    }
                  />
                </label>
                <label>
                  ราคา/หน่วย (บาท)
                  <input
                    type="number"
                    min={0}
                    max={9999999}
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(item.key, "price", e.target.value)
                    }
                    placeholder="ไม่ทราบ"
                  />
                </label>
                <button
                  className="button danger-light"
                  type="button"
                  aria-label={"ลบรายการที่ " + (index + 1)}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((row) => row.key !== item.key),
                    )
                  }
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
          <div className="row-between">
            <button
              className="button secondary"
              type="button"
              disabled={items.length >= 20}
              onClick={() =>
                setItems((current) => [
                  ...current,
                  {
                    key: nextKey.current++,
                    name: "",
                    quantity: "1",
                    unit: "ชิ้น",
                    price: "",
                  },
                ])
              }
            >
              ＋ เพิ่มอุปกรณ์
            </button>
            {items.length > 0 && (
              <span>
                รวมราคาที่ระบุ{" "}
                <strong>{money(estimatedTotal(parsedItems))}</strong> บาท
              </span>
            )}
          </div>
          {items.some((item) => item.price === "") && (
            <p className="muted small">
              ยังมีรายการไม่ระบุราคา ยอดนี้จึงไม่ใช่งบประมาณทั้งหมด
            </p>
          )}
        </fieldset>
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <p className="muted small">
            เมื่อบันทึกแล้ว ระบบจะออกเลขเอกสารให้
            <br />
            เอกสารขอจัดซื้อต้องได้รับการลงนามอนุมัติตามขั้นตอนบริษัท
          </p>
          <button className="button primary" disabled={busy} type="submit">
            {busy ? "กำลังบันทึก…" : "บันทึกและดูเอกสาร →"}
          </button>
        </div>
      </form>
    </section>
  );
}
