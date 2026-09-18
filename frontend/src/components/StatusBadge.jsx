const LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={`badge badge-${status}`}>{LABELS[status] || status}</span>;
}
