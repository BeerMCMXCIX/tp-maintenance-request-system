import { statusLabels, type TicketStatus } from "../domain/tickets";
export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={"status-badge status-" + status.toLowerCase()}>
      <span aria-hidden="true">●</span> {statusLabels[status]}
    </span>
  );
}
