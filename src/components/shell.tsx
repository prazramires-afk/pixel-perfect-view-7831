import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Home, Menu, Package, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/products", label: "Products", icon: Package },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/more", label: "More", icon: Menu },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {back ? (
            <Link
              to={back}
              className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold leading-tight">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-md space-y-3 px-4 pb-28 pt-3">{children}</div>;
}

export function EmptyState({ title, hint, icon }: { title: string; hint: string; icon?: ReactNode }) {
  return (
    <div className="card-soft flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        {icon ?? <Package className="h-6 w-6" />}
      </div>
      <p className="font-bold">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Selector({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "accent" | "danger";
}) {
  const tones: Record<string, string> = {
    default: "bg-card",
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    danger: "bg-destructive text-destructive-foreground",
  };
  return (
    <div className={cn("card-soft px-3 py-3", tones[tone])}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 truncate text-lg font-extrabold">{value}</p>
    </div>
  );
}

export function Row({
  title,
  subtitle,
  right,
  onClick,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "card-soft grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3",
        onClick && "cursor-pointer active:opacity-80",
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-bold">{title}</p>
        {subtitle ? <div className="truncate text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      {right ? <div className="shrink-0 text-right">{right}</div> : null}
    </div>
  );
}
