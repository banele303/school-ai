import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/provider/theme";
import { cn } from "@/lib/utils";

type ThemeModeToggleProps = {
  compact?: boolean;
  className?: string;
};

export function ThemeModeToggle({ compact = false, className }: ThemeModeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = isDark ? "Light" : "Dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      className={cn(
        "shrink-0 border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        !compact && "px-3",
        className
      )}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon className="h-4 w-4" />
      {!compact && <span className="hidden sm:inline">{label}</span>}
    </Button>
  );
}
