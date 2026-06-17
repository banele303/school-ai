import { Link } from "react-router";

type SchoolBrandProps = {
  to?: string;
  compact?: boolean;
};

export function SchoolBrand({ to = "/", compact = false }: SchoolBrandProps) {
  const content = (
    <div className={`flex items-center gap-2 ${compact ? "" : ""}`}>
      <img
        src="/logo-school.jpeg"
        alt="MogoSchool"
        className={`${compact ? "h-8 w-auto" : "h-11 w-auto"} rounded-xl`}
      />
      {!compact && <span className="font-extrabold tracking-tight text-gray-900 dark:text-white text-xl">Vhembe Rising Star Academy</span>}
    </div>
  );

  if (!to) {
    return <div>{content}</div>;
  }

  return <Link to={to}>{content}</Link>;
}
