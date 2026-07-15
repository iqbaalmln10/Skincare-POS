export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="coming-soon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4l2.5 2.5" />
      </svg>
      <h2>{title}</h2>
      <p>Modul ini belum dibangun. Segera menyusul.</p>
    </div>
  );
}