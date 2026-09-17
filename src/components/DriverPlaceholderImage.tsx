export function DriverPlaceholderImage({ className }: { className?: string }) {
  return (
    <div
      className={`bg-white border border-oryx-silver rounded-full flex items-center justify-center overflow-hidden ${className ?? ''}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full p-2" aria-label="Driver photo not available">
        <circle cx="50" cy="38" r="20" fill="#A9A9A9" />
        <path d="M15 90 C15 65 30 55 50 55 C70 55 85 65 85 90 Z" fill="#A9A9A9" />
      </svg>
    </div>
  );
}
