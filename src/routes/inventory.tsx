import { createFileRoute } from "@tanstack/react-router";
import { PackagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row, Selector } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyStockChange,
  formatDate,
  getAll,
  stockStatus,
  useData,
  type MovementType,
} from "@/lib/db";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — PetShop Managing Apps" },
      { name: "description", content: "Stock in, adjustments, damaged and expired goods with a full movement log." },
      { property: "og:title", content: "Inventory — PetShop Managing Apps" },
      { property: "og:description", content: "Stock in, adjustments, damaged and expired goods with a full movement log." },
    ],
  }),
  component: Inventory,
});

const TYPES: { value: MovementType; label: string; sign: 1 | -1 }[] = [
  { value: "PURCHASE", label: "Stock in", sign: 1 },
  { value: "ADJUSTMENT", label: "Adjustment (add)", sign: 1 },
  { value: "DAMAGE", label: "Damaged (remove)", sign: -1 },
  { value: "EXPIRED", label: "Expired (remove)", sign: -1 },
  { value: "RETURN", label: "Customer return (add)", sign: 1 },
];

function Inventory() {
  const ready = useData();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<MovementType>("PURCHASE");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  const products = ready ? getAll("products") : [];
  const movements = ready ? getAll("movements").slice(0, 40) : [];
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "Deleted product";

  const submit = () => {
    if (!productId) {
      toast.error("Choose a product first.");
      return;
    }
    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    const conf = TYPES.find((t) => t.value === type)!;
    applyStockChange({ productId, delta: conf.sign * quantity, type, reason });
    toast.success(`${conf.label} recorded.`);
    setQuantity(1);
    setReason("");
  };

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock in, adjustments and losses" />
      <Page>
        <div className="card-soft space-y-3 px-3 py-3">
          <Field label="Product">
            <Selector
              value={productId}
              onChange={setProductId}
              placeholder="Select product"
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.stock} ${p.unit})` }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Action">
              <Selector value={type} onChange={(v) => setType(v as MovementType)} options={TYPES.map((t) => ({ value: t.value, label: t.label }))} />
            </Field>
            <Field label="Quantity">
              <Input type="number" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Note (optional)">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. delivery from supplier" />
          </Field>
          <Button className="w-full" onClick={submit}>
            <PackagePlus className="h-4 w-4" /> Record movement
          </Button>
        </div>

        <h2 className="pt-2 text-sm font-extrabold">Low & out of stock</h2>
        {products.filter((p) => stockStatus(p) !== "In Stock").length === 0 ? (
          <p className="card-soft px-3 py-4 text-sm text-muted-foreground">All products are healthy.</p>
        ) : (
          <div className="space-y-2">
            {products
              .filter((p) => stockStatus(p) !== "In Stock")
              .map((p) => (
                <Row
                  key={p.id}
                  title={p.name}
                  subtitle={stockStatus(p)}
                  right={
                    <span className="font-extrabold">
                      {p.stock} {p.unit}
                    </span>
                  }
                />
              ))}
          </div>
        )}

        <h2 className="pt-2 text-sm font-extrabold">Recent movements</h2>
        {movements.length === 0 ? (
          <EmptyState title="No movements yet" hint="Every stock change is logged here automatically." />
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <Row
                key={m.id}
                title={nameOf(m.productId)}
                subtitle={`${m.type} · ${formatDate(m.date)}${m.reason ? ` · ${m.reason}` : ""}`}
                right={
                  <span className={m.quantity >= 0 ? "font-extrabold text-primary" : "font-extrabold text-destructive"}>
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Page>
    </>
  );
}
