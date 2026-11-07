import { FIRM } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Text-based wordmark. Replace with the firm's logo file (e.g. /brand/logo.svg) when available.
export function BrandMark({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="6" fill={light ? "#ffffff" : "#1f3350"} />
        <path
          d="M7 23V9.5l4.6 7.2 4.4-7.2 4.4 7.2L25 9.5V23"
          fill="none"
          stroke={light ? "#1f3350" : "#ffffff"}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <rect x="7" y="25" width="18" height="1.6" rx="0.8" fill="#c4974f" />
      </svg>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-[1.05rem] font-semibold tracking-tight",
            light ? "text-white" : "text-navy"
          )}
        >
          {FIRM.name}
        </span>
      </span>
    </span>
  );
}
