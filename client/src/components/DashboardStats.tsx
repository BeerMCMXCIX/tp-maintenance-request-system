import type { TicketStats } from "../domain/tickets";
export default function DashboardStats({
  stats,
}: {
  stats: TicketStats | null;
}) {
  const cards = [
    {
      label: "คำขอทั้งหมด",
      value: stats?.total,
      hint: "รวมทุกแผนก",
      color: "blue",
    },
    {
      label: "รอ IT ดำเนินการ",
      value: stats ? stats.counts.PENDING + stats.counts.IN_REVIEW : undefined,
      hint: "รับคำขอและตรวจสอบ",
      color: "amber",
    },
    {
      label: "รออนุมัติ / จัดซื้อ",
      value: stats
        ? stats.counts.AWAITING_APPROVAL +
          stats.counts.APPROVED +
          stats.counts.PURCHASING
        : undefined,
      hint: "อยู่ระหว่างดำเนินการ",
      color: "violet",
    },
    {
      label: "เสร็จสิ้นแล้ว",
      value: stats?.counts.COMPLETED,
      hint: "ปิดงานเรียบร้อย",
      color: "green",
    },
  ];
  return (
    <section className="stats-grid" aria-label="สรุปคำขอทั้งหมด">
      {cards.map((card) => (
        <article key={card.label} className={"stat-card " + card.color}>
          <p>{card.label}</p>
          <strong>
            {card.value === undefined
              ? "—"
              : card.value.toLocaleString("th-TH")}
          </strong>
          <span>{card.hint}</span>
        </article>
      ))}
    </section>
  );
}
