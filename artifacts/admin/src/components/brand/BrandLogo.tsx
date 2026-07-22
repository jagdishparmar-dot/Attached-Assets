import logoUrl from "@assets/Screenshot_2026-06-29_at_8.17.10_PM_1782744451491.png";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  /** Override default subtitle under Coldverse */
  subtitle?: string;
  /** Stack logo above wordmark (login / marketing) */
  stacked?: boolean;
  className?: string;
};

const SIZES = {
  sm: { plate: "h-9 w-9 rounded-lg", img: "h-5 max-w-[1.4rem]", title: "text-sm", subtitle: "text-[10px]", gap: "gap-3" },
  md: { plate: "h-10 w-10 rounded-xl", img: "h-6 max-w-[1.75rem]", title: "text-[15px]", subtitle: "text-[11px]", gap: "gap-3" },
  lg: { plate: "h-14 w-14 rounded-2xl", img: "h-8 max-w-[2.25rem]", title: "text-xl", subtitle: "text-sm", gap: "gap-3" },
  xl: { plate: "h-20 w-20 rounded-[1.35rem]", img: "h-11 max-w-[3rem]", title: "text-3xl", subtitle: "text-sm", gap: "gap-4" },
} as const;

export function BrandLogo({
  size = "md",
  showWordmark = true,
  subtitle = "Admin Console",
  stacked = false,
  className,
}: BrandLogoProps) {
  const s = SIZES[size];
  const onDarkSidebar = showWordmark && !stacked && size !== "lg" && size !== "xl";

  return (
    <div
      className={cn(
        "flex min-w-0",
        stacked ? "flex-col items-center text-center" : "items-center",
        s.gap,
        className,
      )}
    >
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          "bg-[#FFF8F5] ring-1 ring-[#FF3C00]/20 shadow-sm",
          "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,rgba(255,60,0,0.12),transparent_60%)]",
          s.plate,
        )}
      >
        <img
          src={logoUrl}
          alt="Coldverse"
          className={cn("relative z-10 w-auto object-contain", s.img)}
        />
      </div>
      {showWordmark && (
        <div className={cn("min-w-0 flex flex-col", stacked ? "items-center" : "leading-none")}>
          <span
            className={cn(
              "font-semibold tracking-tight",
              onDarkSidebar ? "text-sidebar-foreground" : "text-foreground",
              s.title,
            )}
          >
            Coldverse
          </span>
          <span
            className={cn(
              "mt-1.5 font-medium",
              stacked ? "max-w-[16rem]" : "truncate",
              onDarkSidebar ? "text-sidebar-foreground/45" : "text-muted-foreground",
              s.subtitle,
            )}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
