import { Bot, CalendarClock, FileText, Images, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const APPS = [
  { id: "assistant", name: "Assistant", icon: Bot, live: true, tint: "bg-primary" },
  { id: "docs", name: "Docs (soon)", icon: FileText, live: false, tint: "bg-brand-violet" },
  { id: "studio", name: "Image studio (soon)", icon: Images, live: false, tint: "bg-brand-pink" },
  { id: "planner", name: "Planner (soon)", icon: CalendarClock, live: false, tint: "bg-brand-green" },
];

export function AppRail({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Apps"
      className={cn(
        "flex w-16 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-4",
        className,
      )}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
        N
      </div>
      {APPS.map((app) => {
        const Icon = app.icon;
        return (
          <Tooltip key={app.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={app.name}
                aria-current={app.live ? "page" : undefined}
                disabled={!app.live}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  app.live
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary disabled:opacity-60",
                )}
              >
                <Icon className="h-5 w-5" />
                {app.live ? (
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                      app.tint,
                    )}
                  />
                ) : (
                  <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 opacity-70" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{app.name}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
