import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "outline" | "accent" | "success" | "danger" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-0.5 whitespace-nowrap",
        variant === "default" && "bg-mist text-navy",
        variant === "outline" && "border border-line text-navy",
        variant === "accent" && "bg-accent-tint text-accent border border-accent/30",
        variant === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        variant === "danger" && "bg-red-50 text-red-700 border border-red-200",
        variant === "warning" && "bg-amber-50 text-amber-800 border border-amber-200",
        className
      )}
      {...props}
    />
  );
}
