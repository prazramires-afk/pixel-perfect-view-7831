import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";

import { Field, Page, PageHeader, Row, Selector, StatCard } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  download, expiryStatus, formatDate, formatMoney, getAll, getSettings, saleProfit, stockStatus, toCsv, useData,
} from "@/lib/db";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — PetShop Managing Apps" },
      { name: "description", content: "Sales, profit, expenses and stock reports for your pet shop." },
      { property: "og:title", content: "Reports — PetShop Managing Apps" },
      { property: "og:description", content: "Sales, profit, expenses and stock reports for your pet shop." },
    ],
  }),
  component: Reports,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function rangeFor(preset: string): [string, string] {
  const now = new Date();
  if (preset === "today") return [iso(now), iso(now)];
  if (preset === "7") return [iso(new Date(Date.now() - 6 * 86400000)), iso(now)];
  if (preset === "month") return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
  if (preset === "year") return [`${now.getFullYear()}-01-01`, iso(now)];
  return ["2000-01-01", "2999-12-31"];
}

function Reports() {
  const ready = useData();
  const [preset, setPreset] = useState("month");
  const [custom, setCustom] = useState<[string, string]>(rangeFor("month"));
  if (!ready) return null;
  const [from, to] = preset === "custom" ? custom : rangeFor(preset);
  const inRange = (d: string) => { const x = d.slice(0, 10); return x >= from && x <= to; };

  const sales = getAll("sales").filter((s) => inRange(s.createdAt));
  const expenses = getAll("expenses").filter((e) => inRange(e.date));
  const products = getAll("products");
  const revenue = sales.reduce((a, s) => a + s.total, 0);
  const gross = sales.reduce((a, s) => a + saleProfit(s), 0);
  const expTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const stockValue = products.reduce((a, p) => a + p.costPrice * p.stock, 0);
  const warn = getSettings().expiryWarningDays;

  const top = new Map<string, { name: string; qty: number; total: number }>();
  sales.forEach((s) => s.items.forEach((it) => {
    const t = top.get(it.productId) ?? { name: it.productName, qty: 0, total: 0 };
    t.qty += it.quantity; t.total += it.subtotal; top.set(it.productId, t);
  }));
  const topList = [...top.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  const byCat = new Map<string, number>();
  expenses.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));

  const exportSales = () => download(`sales_${from}_${to}.csv`, toCsv(sales.map((s) => ({
    invoice: s.invoiceNumber, date: s.createdAt, items: s.items.length, subtotal: s.subtotal, discount: s.discount, total: s.total, profit: saleProfit(s), payment: s.paymentMethod,
  }))), "text/csv");

  return (
    <>
      <PageHeader title="Reports" subtitle={`${formatDate(from)} – ${formatDate(to)}`} />
      <Page>
        <Selector value={preset} onChange={setPreset} options={[
          { value: "today", label: "Today" }, { value: "7", label: "Last 7 days" }, { value: "month", label: "This month" },
          { value: "year", label: "This year" }, { value: "all", label: "All time" }, { value: "custom", label: "Custom range" },
        ]} />
        {preset === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="From"><Input type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} /></Field>
            <Field label="To"><Input type="date" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} /></Field>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Revenue" value={formatMoney(revenue)} tone="primary" />
          <StatCard label="Transactions" value={String(sales.length)} />
          <StatCard label="Gross profit" value={formatMoney(gross)} />
          <StatCard label="Expenses" value={formatMoney(expTotal)} tone="accent" />
          <StatCard label="Net profit" value={formatMoney(gross - expTotal)} tone={gross - expTotal < 0 ? "danger" : "default"} />
          <StatCard label="Stock value (cost)" value={formatMoney(stockValue)} />
        </div>
        <Button variant="outline" className="w-full" onClick={exportSales} disabled={!sales.length}>
          <Download className="h-4 w-4" /> Export sales CSV
        </Button>

        <h2 className="pt-2 font-extrabold">Top-selling products</h2>
        {topList.length ? topList.map((t, i) => (
          <Row key={i} title={t.name} subtitle={`${t.qty} sold`} right={<b>{formatMoney(t.total)}</b>} />
        )) : <p className="text-sm text-muted-foreground">No sales in this period.</p>}

        <h2 className="pt-2 font-extrabold">Expenses by category</h2>
        {byCat.size ? [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
          <Row key={c} title={c} right={<b>{formatMoney(v)}</b>} />
        )) : <p className="text-sm text-muted-foreground">No expenses in this period.</p>}

        <h2 className="pt-2 font-extrabold">Stock summary</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Out of stock" value={String(products.filter((p) => stockStatus(p) === "Out of Stock").length)} />
          <StatCard label="Low stock" value={String(products.filter((p) => stockStatus(p) === "Low Stock").length)} />
          <StatCard label="Expiring soon" value={String(products.filter((p) => expiryStatus(p, warn) === "Expiring Soon").length)} />
          <StatCard label="Expired" value={String(products.filter((p) => expiryStatus(p, warn) === "Expired").length)} />
        </div>
      </Page>
    </>
  );
}
