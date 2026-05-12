// Reusable logo component that displays the company logo.
// `size` controls width/height in px. Default 40.
export default function Logo({ size = 40, className = "", showText = true, subtitle = null }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.jpg"
        alt="StokTakip Logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain rounded-sm bg-white"
        data-testid="app-logo"
      />
      {showText && (
        <div className="leading-tight">
          <div className="font-display font-bold text-slate-900 tracking-tight" style={{ fontSize: size > 36 ? "1.05rem" : "0.95rem" }}>
            StokTakip
          </div>
          {subtitle !== null && (
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mt-0.5">
              {subtitle ?? "Üretim & Satış"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
