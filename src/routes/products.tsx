import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Package, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row, Selector } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ANIMAL_TYPES,
  expiryStatus,
  formatMoney,
  getAll,
  getCategories,
  getSettings,
  stockStatus,
  uid,
  upsert,
  useData,
  type Product,
} from "@/lib/db";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — PetShop Managing Apps" },
      { name: "description", content: "Manage pet food, medicine and accessories with stock and expiry tracking." },
      { property: "og:title", content: "Products — PetShop Managing Apps" },
      { property: "og:description", content: "Manage pet food, medicine and accessories with stock and expiry tracking." },
    ],
  }),
  component: Products,
});

export function emptyProduct(): Product {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    brand: "",
    animalType: "",
    unit: "pcs",
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    minimumStock: 0,
    supplierId: "",
    expiryDate: "",
    batchNumber: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function Products() {
  const ready = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);

  const settings = ready ? getSettings() : getSettings();
  const products = ready ? getAll("products") : [];
  const categories = ready ? getCategories() : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && ![p.name, p.sku, p.barcode, p.brand].some((v) => (v || "").toLowerCase().includes(q))) return false;
      if (category && p.categoryId !== category) return false;
      if (status && stockStatus(p) !== status) return false;
      return true;
    });
  }, [products, query, category, status]);

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${products.length} item(s)`}
        right={
          <Button size="sm" onClick={() => setEditing(emptyProduct())}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />
      <Page>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, SKU, barcode"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Selector
            value={category}
            onChange={setCategory}
            placeholder="All categories"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Selector
            value={status}
            onChange={setStatus}
            placeholder="All stock"
            options={["In Stock", "Low Stock", "Out of Stock"].map((s) => ({ value: s, label: s }))}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No products yet"
            hint="Add your first product to start managing inventory."
            icon={<Package className="h-6 w-6" />}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => {
              const st = stockStatus(p);
              const ex = expiryStatus(p, settings.expiryWarningDays);
              return (
                <Row
                  key={p.id}
                  onClick={() => navigate({ to: "/product/$id", params: { id: p.id } })}
                  title={p.name || "Unnamed product"}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-1">
                      <Tag tone={st === "In Stock" ? "ok" : st === "Low Stock" ? "warn" : "bad"}>{st}</Tag>
                      {ex && ex !== "Normal" ? <Tag tone={ex === "Expired" ? "bad" : "warn"}>{ex}</Tag> : null}
                      <span>
                        {p.stock} {p.unit}
                      </span>
                    </span>
                  }
                  right={
                    <span className="font-extrabold">{formatMoney(p.sellingPrice, settings.currency)}</span>
                  }
                />
              );
            })}
          </div>
        )}
      </Page>

      <ProductDialog product={editing} onClose={() => setEditing(null)} />
    </>
  );
}

export function Tag({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const tones = {
    ok: "bg-secondary text-secondary-foreground",
    warn: "bg-warning text-warning-foreground",
    bad: "bg-destructive text-destructive-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function ProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Product | null>(product);
  const ready = useData();
  const categories = ready ? getCategories() : [];
  const suppliers = ready ? getAll("suppliers") : [];

  if (product && (!draft || draft.id !== product.id)) setDraft(product);
  const p = draft;
  const set = (patch: Partial<Product>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = () => {
    if (!p) return;
    if (!p.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    upsert("products", { ...p, updatedAt: new Date().toISOString() });
    toast.success("Product saved.");
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{p && getAll("products").some((x) => x.id === p.id) ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        {p ? (
          <div className="space-y-3">
            <Field label="Product name">
              <Input value={p.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="SKU">
                <Input value={p.sku} onChange={(e) => set({ sku: e.target.value })} />
              </Field>
              <Field label="Barcode">
                <Input value={p.barcode} onChange={(e) => set({ barcode: e.target.value })} />
              </Field>
              <Field label="Category">
                <Selector
                  value={p.categoryId}
                  onChange={(v) => set({ categoryId: v })}
                  placeholder="Select"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
              </Field>
              <Field label="Animal type">
                <Selector
                  value={p.animalType}
                  onChange={(v) => set({ animalType: v })}
                  placeholder="Select"
                  options={ANIMAL_TYPES.map((a) => ({ value: a, label: a }))}
                />
              </Field>
              <Field label="Brand">
                <Input value={p.brand} onChange={(e) => set({ brand: e.target.value })} />
              </Field>
              <Field label="Unit">
                <Input value={p.unit} onChange={(e) => set({ unit: e.target.value })} />
              </Field>
              <Field label="Cost price">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={p.costPrice}
                  onChange={(e) => set({ costPrice: Number(e.target.value) })}
                />
              </Field>
              <Field label="Selling price">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={p.sellingPrice}
                  onChange={(e) => set({ sellingPrice: Number(e.target.value) })}
                />
              </Field>
              <Field label="Current stock">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={p.stock}
                  onChange={(e) => set({ stock: Number(e.target.value) })}
                />
              </Field>
              <Field label="Minimum stock">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={p.minimumStock}
                  onChange={(e) => set({ minimumStock: Number(e.target.value) })}
                />
              </Field>
              <Field label="Expiry date">
                <Input type="date" value={p.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} />
              </Field>
              <Field label="Batch number">
                <Input value={p.batchNumber} onChange={(e) => set({ batchNumber: e.target.value })} />
              </Field>
            </div>
            <Field label="Supplier">
              <Selector
                value={p.supplierId}
                onChange={(v) => set({ supplierId: v })}
                placeholder="No supplier"
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </Field>
            <Field label="Notes">
              <Textarea rows={2} value={p.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
            <Button className="w-full" onClick={save}>
              Save product
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
