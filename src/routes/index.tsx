import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, PackagePlus, PawPrint, Plus, Receipt, TrendingUp } from "lucide-react";

import { Page, PageHeader, Row, StatCard } from "@/components/shell";
import {
  expiryStatus,
  formatMoney,
  getAll,
  getSettings,
  isSameDay,
  saleProfit,
  stockStatus,
  useData,
} from "@/lib/db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PetShop Managing Apps" },
      { name: "description", content: "Today's sales, profit, expenses and stock alerts for your pet shop." },
      { property: "og:title", content: "Dashboard — PetShop Managing Apps" },
      { property: "og:description", content: "Today's sales, profit, expenses and stock alerts for your pet shop." },
    ],
  }),
  component: Dashboard,
});

const QUICK = [
  { to: "/sales", label: "New Sale", icon: Receipt },
  { to: "/inventory", label: "Stock In", icon: PackagePlus },
  { to: "/products", label: "Add Product", icon: Plus },
  { to: "/expenses", label: "Add Expense", icon: TrendingUp },
] as const;

function Dashboard() {
  const ready = useData();
  const settings = ready ? getSettings() : { shopName: "My Pet Shop", currency: "Rp", expiryWarningDays: 30 };
  const sales = ready ? getAll("sales") : [];
  const expenses = ready ? getAll("expenses") : [];
  const products = ready ? getAll("products") : [];

  const todaySales = sales.filter((s) => isSameDay(s.createdAt));
  const revenue = todaySales.reduce((a, s) => a + s.total, 0);
  const profit = todaySales.reduce((a, s) => a + saleProfit(s), 0);
  const todayExpenses = expenses.filter((e) => isSameDay(e.date)).reduce((a, e) => a + e.amount, 0);

  const out = products.filter((p) => stockStatus(p) === "Out of Stock");
  const low = products.filter((p) => stockStatus(p) === "Low Stock");
  const soon = products.filter((p) => expiryStatus(p, settings.expiryWarningDays) === "Expiring Soon");
  const expired = products.filter((p) => expiryStatus(p, settings.expiryWarningDays) === "Expired");

  const sold = new Map<string, { name: string; qty: number }>();
  sales.forEach((s) =>
    s.items.forEach((it) => {
      const cur = sold.get(it.productId) ?? { name: it.productName, qty: 0 };
      cur.qty += it.quantity;
      sold.set(it.productId, cur);
    }),
  );
  const top = [...sold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <>
      <PageHeader
        title={settings.shopName}
        subtitle="PetShop Managing Apps"
        right={<PawPrint className="h-6 w-6 text-primary" />}
      />
      <Page>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Today's Sales" value={formatMoney(revenue, settings.currency)} tone="primary" />
          <StatCard label="Transactions" value={String(todaySales.length)} />
          <StatCard label="Est. Profit" value={formatMoney(profit, settings.currency)} tone="accent" />
          <StatCard label="Expenses" value={formatMoney(todayExpenses, settings.currency)} />
        </div>

        <h2 className="pt-2 text-sm font-extrabold">Quick actions</h2>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map((q) => (
            <Link
              key={q.label}
              to={q.to}
              className="card-soft flex flex-col items-center gap-1 px-1 py-3 text-center text-[11px] font-bold"
            >
              <q.icon className="h-5 w-5 text-primary" />
              {q.label}
            </Link>
          ))}
        </div>

        <h2 className="pt-2 text-sm font-extrabold">Stock alerts</h2>
        <div className="grid grid-cols-2 gap-2">
          <AlertCard label="Out of stock" count={out.length} icon={<AlertTriangle className="h-4 w-4" />} />
          <AlertCard label="Low stock" count={low.length} icon={<AlertTriangle className="h-4 w-4" />} />
          <AlertCard label="Expiring soon" count={soon.length} icon={<CalendarClock className="h-4 w-4" />} />
          <AlertCard label="Expired" count={expired.length} icon={<CalendarClock className="h-4 w-4" />} />
        </div>

        <h2 className="pt-2 text-sm font-extrabold">Recent transactions</h2>
        {sales.length === 0 ? (
          <p className="card-soft px-3 py-4 text-sm text-muted-foreground">
            No sales yet. Your completed sales will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {sales.slice(0, 5).map((s) => (
              <Row
                key={s.id}
                title={s.invoiceNumber}
                subtitle={`${s.items.length} item(s) · ${s.paymentMethod}`}
                right={<span className="font-extrabold">{formatMoney(s.total, settings.currency)}</span>}
              />
            ))}
          </div>
        )}

        <h2 className="pt-2 text-sm font-extrabold">Top selling products</h2>
        {top.length === 0 ? (
          <p className="card-soft px-3 py-4 text-sm text-muted-foreground">No sales data yet.</p>
        ) : (
          <div className="space-y-2">
            {top.map((t) => (
              <Row key={t.name} title={t.name} right={<span className="font-bold">{t.qty} sold</span>} />
            ))}
          </div>
        )}
      </Page>
    </>
  );
}

function AlertCard({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="card-soft flex items-center justify-between px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-lg font-extrabold">{count}</p>
      </div>
      <span className={count > 0 ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
    </div>
  );
}
