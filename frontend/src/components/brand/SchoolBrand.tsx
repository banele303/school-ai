import { Link } from "react-router";
import { GraduationCap } from "lucide-react";

type SchoolBrandProps = {
  to?: string;
  compact?: boolean;
};

export function SchoolBrand({ to = "/", compact = false }: SchoolBrandProps) {
  const content = (
    <div className={`flex items-center gap-2 ${compact ? "" : ""}`}>
      <div className={`${compact ? "w-9 h-9" : "w-11 h-11"} rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20`}>
        <GraduationCap className={`${compact ? "w-5 h-5" : "w-6 h-6"} text-white`} />
      </div>
      {!compact && <span className="font-extrabold tracking-tight text-gray-900 dark:text-white text-xl">School AI</span>}
    </div>
  );

  if (!to) {
    return <div>{content}</div>;
  }

  return <Link to={to}>{content}</Link>;
}
