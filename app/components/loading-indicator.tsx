export default function LoadingIndicator({
  label = "กำลังโหลดข้อมูล...",
}: {
  label?: string;
}) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <span className="app-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
