import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Page, PageHeader, Row, StatCard } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  applyStockChange,
  formatDate,
  formatMoney,
  getAll,
  getSettings,
  remove,
  saleProfit,
  useData,
} from "@/lib/db";

export const Route = createFileRoute("/sale/$id")({
  head: () => ({
    meta: [
      { title: "Receipt — PetShop Managing Apps" },
      { name: "description", content: "Sale receipt with items, discount, payment method and profit." },
      { property: "og:title", content: "Receipt — PetShop Managing Apps" },
      { property: "og:description", content: "Sale receipt with items, discount, payment method and profit." },
    ],
  }),
  component: SaleDetail,
});

function SaleDetail() {
  const { id } = Route.useParams();
  const ready = useData();
  const navigate = useNavigate();
  const settings = getSettings();
  const sale = ready ? getAll("sales").find((s) => s.id === id) : undefined;
  const customer = ready ? getAll("customers").find((c) => c.id === sale?.customerId) : undefined;

  if (!ready) return <Page>Loading…</Page>;
  if (!sale)
    return (
      <>
        <PageHeader title="Receipt" back="/sales" />
        <Page>
          <p className="card-soft px-3 py-4 text-sm text-muted-foreground">This sale no longer exists.</p>
        </Page>
      </>
    );

  const del = () => {
    if (!confirm("Delete this sale and return the items to stock?")) return;
    sale.items.forEach((it) =>
      applyStockChange({
        productId: it.productId,
        delta: it.quantity,
        type: "RETURN",
        reason: `Cancelled ${sale.invoiceNumber}`,
        referenceId: sale.id,
      }),
    );
    remove("sales", sale.id);
    toast.success("Sale deleted and stock returned.");
    navigate({ to: "/sales" });
  };

  return (
    <>
      <PageHeader
        title={sale.invoiceNumber}
        subtitle={formatDate(sale.createdAt)}
        back="/sales"
        right={
          <Button size="icon" variant="destructive" onClick={del}>
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
      <Page>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total" value={formatMoney(sale.total, settings.currency)} tone="primary" />
          <StatCard label="Profit" value={formatMoney(saleProfit(sale), settings.currency)} tone="accent" />
          <StatCard label="Payment" value={sale.paymentMethod} />
          <StatCard label="Customer" value={customer?.name || "Walk-in"} />
        </div>

        <h2 className="pt-2 text-sm font-extrabold">Items</h2>
        <div className="space-y-2">
          {sale.items.map((it) => (
            <Row
              key={it.productId}
              title={it.productName}
              subtitle={`${it.quantity} × ${formatMoney(it.sellingPrice, settings.currency)}`}
              right={<span className="font-extrabold">{formatMoney(it.subtotal, settings.currency)}</span>}
            />
          ))}
        </div>

        <div className="card-soft space-y-2 px-3 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatMoney(sale.subtotal, settings.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-semibold">-{formatMoney(sale.discount, settings.currency)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-bold">Total</span>
            <span className="font-extrabold text-primary">{formatMoney(sale.total, settings.currency)}</span>
          </div>
        </div>
      </Page>
    </>
  );
}
