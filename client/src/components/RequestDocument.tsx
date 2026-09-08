import {
  dateTime,
  estimatedTotal,
  money,
  statusLabels,
  type Ticket,
} from "../domain/tickets";

export default function RequestDocument({ ticket }: { ticket: Ticket }) {
  const review = [...ticket.history]
    .reverse()
    .find((event) => event.status === "AWAITING_APPROVAL");
  const hasUnknownPrice = ticket.items.some(
    (item) => item.estimatedUnitPrice === null,
  );
  return (
    <article className="request-document" aria-label="เอกสารสำหรับพิมพ์">
      <header className="document-header">
        <div>
          <div className="document-brand">
            TP<span>COMPANY</span>
          </div>
          <p>แผนกเทคโนโลยีสารสนเทศ</p>
        </div>
        <div className="document-meta">
          <strong>{ticket.documentNumber}</strong>
          <p>วันที่ {dateTime(ticket.createdAt)}</p>
        </div>
      </header>
      <div className="document-title">
        <h2>ใบแจ้งซ่อม / ขออนุมัติจัดซื้ออุปกรณ์ IT</h2>
        <p>เอกสารภายในบริษัท TP</p>
      </div>
      <div className="document-status">
        สถานะ ณ วันที่พิมพ์: <strong>{statusLabels[ticket.status]}</strong> ·
        ความเร่งด่วน: {ticket.priority === "URGENT" ? "เร่งด่วน" : "ปกติ"}
      </div>
      <dl className="document-info">
        <div>
          <dt>ผู้ขอ</dt>
          <dd>{ticket.requesterName || "ไม่ได้ระบุในข้อมูลเดิม"}</dd>
        </div>
        <div>
          <dt>แผนก</dt>
          <dd>{ticket.department || "—"}</dd>
        </div>
        <div>
          <dt>ติดต่อ</dt>
          <dd>{ticket.contact || "—"}</dd>
        </div>
        <div>
          <dt>สถานที่ใช้งาน</dt>
          <dd>{ticket.location || "—"}</dd>
        </div>
        <div className="full-width">
          <dt>รหัสทรัพย์สิน / Serial</dt>
          <dd>{ticket.assetCode || "—"}</dd>
        </div>
      </dl>
      <section className="document-section">
        <h3>1. รายละเอียดคำขอ</h3>
        <p>
          <strong>{ticket.title}</strong>
        </p>
        <p className="preserve-lines">{ticket.description}</p>
      </section>
      <section className="document-section">
        <h3>2. รายการอุปกรณ์ที่ขอจัดซื้อ</h3>
        {ticket.items.length ? (
          <table className="document-table">
            <thead>
              <tr>
                <th scope="col">ลำดับ</th>
                <th scope="col">รายการ / คุณสมบัติ</th>
                <th scope="col">จำนวน</th>
                <th scope="col">หน่วย</th>
                <th scope="col">ราคา/หน่วย</th>
                <th scope="col">รวม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {ticket.items.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td className="numeric">
                    {item.estimatedUnitPrice === null
                      ? "รอราคา"
                      : money(item.estimatedUnitPrice)}
                  </td>
                  <td className="numeric">
                    {item.estimatedUnitPrice === null
                      ? "—"
                      : money(
                          (Math.round(item.estimatedUnitPrice * 100) *
                            item.quantity) /
                            100,
                        )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={5}>
                  รวมประมาณการ
                  {hasUnknownPrice ? " (เฉพาะรายการที่ระบุราคา)" : ""}
                </th>
                <td className="numeric">
                  {money(estimatedTotal(ticket.items))}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p>แจ้งตรวจสอบ / ซ่อมแซม — ยังไม่มีรายการขอจัดซื้อ</p>
        )}
        <p className="document-note">
          ราคาเป็นเพียงประมาณการ ไม่ใช่ใบสั่งซื้อหรือการอนุมัติวงเงิน
          {hasUnknownPrice ? " และยังไม่รวมรายการที่รอราคา" : ""}
        </p>
      </section>
      <section className="document-section">
        <h3>3. ความเห็น IT / เหตุผลส่งขออนุมัติ</h3>
        {review ? (
          <p className="preserve-lines">{review.note}</p>
        ) : (
          <div
            className="writing-lines"
            aria-label="พื้นที่สำหรับเขียนความเห็น IT"
          />
        )}
      </section>
      <section className="signature-section">
        <h3>4. การลงนาม</h3>
        <div className="signature-grid">
          <div>
            <p>ลงชื่อ ................................................</p>
            <p>
              (
              {ticket.requesterName ||
                "........................................"}
              )
            </p>
            <strong>ผู้ขอ / แผนกต้นเรื่อง</strong>
            <p>วันที่ ........../........../..........</p>
          </div>
          <div>
            <p>ลงชื่อ ................................................</p>
            <p>(................................................)</p>
            <strong>ผู้ตรวจสอบฝ่าย IT</strong>
            <p>วันที่ ........../........../..........</p>
          </div>
          <div>
            <p>□ อนุมัติ / □ ไม่อนุมัติ</p>
            <p>ลงชื่อ ................................................</p>
            <strong>ผู้อนุมัติฝ่ายจัดซื้อ</strong>
            <p>วันที่ ........../........../..........</p>
          </div>
        </div>
      </section>
      <footer className="document-footer">
        อ้างอิง {ticket.documentNumber} · โปรดนำเอกสารไปลงนามตามขั้นตอนบริษัท
        และแจ้งผลให้เจ้าหน้าที่บันทึกในระบบ
      </footer>
    </article>
  );
}
