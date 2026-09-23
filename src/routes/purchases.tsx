import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row, Selector } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  applyStockChange,
  formatDate,
  formatMoney,
  getAll,
  getSettings,
  remove,
  uid,
  upsert,
  useData,
  type PurchaseItem,
} from "@/lib/db";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — PetShop Managing Apps" },
      { name: "description", content: "Record supplier purchases and add the goods straight into stock." },
      { property: "og:title", content: "Purchases — PetShop Managing Apps" },
      { property: "og:description", content: "Record supplier purchases and add the goods straight into stock." },
    ],
  }),
  component: Purchases,
});

function Purchases() {
  const ready = useData();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [pick, setPick] = useState("");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);

  const settings = getSettings();
  const products = ready ? getAll("products") : [];
  const suppliers = ready ? getAll("suppliers") : [];
  const purchases = ready ? getAll("purchases") : [];

  const total = items.reduce((a, it) => a + it.subtotal, 0);

  const addItem = () => {
    const p = products.find((x) => x.id === pick);
    if (!p) {
      toast.error("Choose a product.");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    const unitCost = cost || p.costPrice;
    setItems((rows) => [
      ...rows,
      { productId: p.id, productName: p.name, quantity: qty, costPrice: unitCost, subtotal: qty * unitCost },
    ]);
    setPick("");
    setQty(1);
    setCost(0);
  };

  const save = () => {
    if (items.length === 0) {
      toast.error("Add at least one item.");
      return;
    }
    const id = uid();
    upsert("purchases", { id, supplierId, items, total, date, notes });
    items.forEach((it) =>
      applyStockChange({
        productId: it.productId,
        delta: it.quantity,
        type: "PURCHASE",
        reason: suppliers.find((s) => s.id === supplierId)?.name ?? "Purchase",
        referenceId: id,
      }),
    );
    toast.success("Purchase recorded and stock updated.");
    setItems([]);
    setNotes("");
    setSupplierId("");
    setOpen(false);
  };

  const del = (id: string) => {
    if (!confirm("Delete this purchase record? Stock will not be changed back.")) return;
    remove("purchases", id);
    toast.success("Purchase deleted.");
  };

  return (
    <>
      <PageHeader
        title="Purchases"
        subtitle={`${purchases.length} record(s)`}
        back="/more"
        right={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        }
      />
      <Page>
        {purchases.length === 0 ? (
          <EmptyState title="No purchases yet" hint="Record a delivery to add products into stock." icon={<Truck className="h-6 w-6" />} />
        ) : (
          <div className="space-y-2">
            {purchases.map((p) => (
              <Row
                key={p.id}
                title={suppliers.find((s) => s.id === p.supplierId)?.name || "Unknown supplier"}
                subtitle={`${formatDate(p.date)} · ${p.items.length} item(s)${p.notes ? ` · ${p.notes}` : ""}`}
                right={
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold">{formatMoney(p.total, settings.currency)}</span>
                    <button onClick={() => del(p.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Page>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Supplier">
              <Selector
                value={supplierId}
                onChange={setSupplierId}
                placeholder="No supplier"
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <div className="card-soft space-y-2 px-3 py-3">
              <Field label="Product">
                <Selector
                  value={pick}
                  onChange={setPick}
                  placeholder="Select product"
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Quantity">
                  <Input type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                </Field>
                <Field label="Unit cost">
                  <Input type="number" inputMode="numeric" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
                </Field>
              </div>
              <Button variant="secondary" className="w-full" onClick={addItem}>
                <Plus className="h-4 w-4" /> Add item
              </Button>
            </div>

            {items.map((it, i) => (
              <Row
                key={`${it.productId}-${i}`}
                title={it.productName}
                subtitle={`${it.quantity} × ${formatMoney(it.costPrice, settings.currency)}`}
                right={<span className="font-extrabold">{formatMoney(it.subtotal, settings.currency)}</span>}
              />
            ))}

            <Field label="Notes">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex items-center justify-between">
              <span className="font-bold">Total</span>
              <span className="text-xl font-extrabold text-primary">{formatMoney(total, settings.currency)}</span>
            </div>
            <Button className="w-full" onClick={save}>
              Save purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
