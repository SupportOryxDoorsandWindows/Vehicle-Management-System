export function VehiclePlaceholderImage({ className }: { className?: string }) {
  return (
    <div className={`bg-white border border-oryx-silver flex items-center justify-center ${className ?? ''}`}>
      <svg viewBox="0 0 200 100" className="w-full h-full p-4" aria-label="Vehicle photo not available">
        <rect x="20" y="55" width="160" height="30" rx="6" fill="#A9A9A9" />
        <circle cx="55" cy="88" r="10" fill="#022A3A" />
        <circle cx="145" cy="88" r="10" fill="#022A3A" />
        <path d="M40 55 L60 30 H140 L160 55 Z" fill="#A9A9A9" opacity="0.6" />
      </svg>
    </div>
  );
}
