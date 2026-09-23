import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row, Selector } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PAYMENT_METHODS,
  applyStockChange,
  formatDate,
  formatMoney,
  getAll,
  getSettings,
  nextInvoiceNumber,
  uid,
  upsert,
  useData,
  type SaleItem,
} from "@/lib/db";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales & POS — PetShop Managing Apps" },
      { name: "description", content: "Ring up sales quickly and review your transaction history." },
      { property: "og:title", content: "Sales & POS — PetShop Managing Apps" },
      { property: "og:description", content: "Ring up sales quickly and review your transaction history." },
    ],
  }),
  component: Sales,
});

function Sales() {
  const ready = useData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pos" | "history">("pos");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState("Cash");
  const [customerId, setCustomerId] = useState("");

  const settings = getSettings();
  const products = ready ? getAll("products") : [];
  const customers = ready ? getAll("customers") : [];
  const sales = ready ? getAll("sales") : [];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter((p) => [p.name, p.sku, p.barcode, p.brand].some((v) => (v || "").toLowerCase().includes(q)))
      .slice(0, 12);
  }, [products, query]);

  const subtotal = cart.reduce((a, it) => a + it.subtotal, 0);
  const total = Math.max(0, subtotal - (discount || 0));

  const add = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setCart((rows) => {
      const i = rows.findIndex((r) => r.productId === productId);
      if (i >= 0) {
        const next = [...rows];
        const cur = next[i]!;
        const qty = cur.quantity + 1;
        next[i] = { ...cur, quantity: qty, subtotal: qty * cur.sellingPrice };
        return next;
      }
      return [
        ...rows,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          subtotal: p.sellingPrice,
        },
      ];
    });
  };

  const bump = (productId: string, delta: number) => {
    setCart((rows) =>
      rows
        .map((r) =>
          r.productId === productId
            ? { ...r, quantity: r.quantity + delta, subtotal: (r.quantity + delta) * r.sellingPrice }
            : r,
        )
        .filter((r) => r.quantity > 0),
    );
  };

  const checkout = () => {
    if (cart.length === 0) {
      toast.error("Add at least one product first.");
      return;
    }
    const id = uid();
    const sale = {
      id,
      invoiceNumber: nextInvoiceNumber(),
      customerId,
      items: cart,
      subtotal,
      discount: discount || 0,
      total,
      paymentMethod: payment,
      createdAt: new Date().toISOString(),
    };
    upsert("sales", sale);
    cart.forEach((it) =>
      applyStockChange({
        productId: it.productId,
        delta: -it.quantity,
        type: "SALE",
        reason: sale.invoiceNumber,
        referenceId: id,
      }),
    );
    setCart([]);
    setDiscount(0);
    setCustomerId("");
    toast.success(`Sale ${sale.invoiceNumber} saved.`);
    navigate({ to: "/sale/$id", params: { id } });
  };

  return (
    <>
      <PageHeader title="Sales" subtitle={settings.shopName} />
      <Page>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={tab === "pos" ? "default" : "secondary"} onClick={() => setTab("pos")}>
            New sale
          </Button>
          <Button variant={tab === "history" ? "default" : "secondary"} onClick={() => setTab("history")}>
            History
          </Button>
        </div>

        {tab === "pos" ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product to add"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {products.length === 0 ? (
              <EmptyState title="No products" hint="Add products first, then you can sell them here." />
            ) : (
              <div className="space-y-2">
                {results.map((p) => (
                  <Row
                    key={p.id}
                    onClick={() => add(p.id)}
                    title={p.name || "Unnamed product"}
                    subtitle={`Stock ${p.stock} ${p.unit}`}
                    right={<span className="font-extrabold">{formatMoney(p.sellingPrice, settings.currency)}</span>}
                  />
                ))}
              </div>
            )}

            <h2 className="pt-2 text-sm font-extrabold">Cart ({cart.length})</h2>
            {cart.length === 0 ? (
              <p className="card-soft px-3 py-4 text-sm text-muted-foreground">Tap a product above to add it.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((it) => (
                  <div key={it.productId} className="card-soft px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate font-bold">{it.productName}</p>
                      <button onClick={() => bump(it.productId, -it.quantity)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="secondary" onClick={() => bump(it.productId, -1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-extrabold">{it.quantity}</span>
                        <Button size="icon" variant="secondary" onClick={() => bump(it.productId, 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="font-extrabold">{formatMoney(it.subtotal, settings.currency)}</span>
                    </div>
                  </div>
                ))}

                <div className="card-soft space-y-3 px-3 py-3">
                  <Field label="Customer">
                    <Selector
                      value={customerId}
                      onChange={setCustomerId}
                      placeholder="Walk-in customer"
                      options={customers.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Discount">
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Payment">
                      <Selector
                        value={payment}
                        onChange={setPayment}
                        options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatMoney(subtotal, settings.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Total</span>
                    <span className="text-xl font-extrabold text-primary">
                      {formatMoney(total, settings.currency)}
                    </span>
                  </div>
                  <Button className="w-full" onClick={checkout}>
                    <Receipt className="h-4 w-4" /> Complete sale
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : sales.length === 0 ? (
          <EmptyState title="No sales yet" hint="Completed sales will be listed here." icon={<Receipt className="h-6 w-6" />} />
        ) : (
          <div className="space-y-2">
            {sales.map((s) => (
              <Row
                key={s.id}
                onClick={() => navigate({ to: "/sale/$id", params: { id: s.id } })}
                title={s.invoiceNumber}
                subtitle={`${formatDate(s.createdAt)} · ${s.items.length} item(s) · ${s.paymentMethod}`}
                right={<span className="font-extrabold">{formatMoney(s.total, settings.currency)}</span>}
              />
            ))}
          </div>
        )}
      </Page>
    </>
  );
}
