import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Page, PageHeader, Row, StatCard } from "@/components/shell";
import { ProductDialog, Tag } from "@/routes/products";
import { Button } from "@/components/ui/button";
import {
  expiryStatus,
  formatDate,
  formatMoney,
  getAll,
  getCategories,
  getSettings,
  remove,
  stockStatus,
  useData,
  type Product,
} from "@/lib/db";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product details — PetShop Managing Apps" },
      { name: "description", content: "Product stock, margin and movement history." },
      { property: "og:title", content: "Product details — PetShop Managing Apps" },
      { property: "og:description", content: "Product stock, margin and movement history." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const ready = useData();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Product | null>(null);

  const settings = getSettings();
  const product = ready ? getAll("products").find((p) => p.id === id) : undefined;
  const movements = ready ? getAll("movements").filter((m) => m.productId === id) : [];
  const category = ready ? getCategories().find((c) => c.id === product?.categoryId) : undefined;
  const supplier = ready ? getAll("suppliers").find((s) => s.id === product?.supplierId) : undefined;

  if (!ready) return <Page>Loading…</Page>;
  if (!product)
    return (
      <>
        <PageHeader title="Product" back="/products" />
        <Page>
          <p className="card-soft px-3 py-4 text-sm text-muted-foreground">This product no longer exists.</p>
        </Page>
      </>
    );

  const profitPerUnit = product.sellingPrice - product.costPrice;
  const margin = product.sellingPrice > 0 ? (profitPerUnit / product.sellingPrice) * 100 : 0;
  const ex = expiryStatus(product, settings.expiryWarningDays);

  const del = () => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    remove("products", product.id);
    toast.success("Product deleted.");
    navigate({ to: "/products" });
  };

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={category?.name || "Uncategorised"}
        back="/products"
        right={
          <div className="flex gap-1">
            <Button size="icon" variant="secondary" onClick={() => setEditing(product)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="destructive" onClick={del}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <Page>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Stock" value={`${product.stock} ${product.unit}`} tone="primary" />
          <StatCard label="Selling price" value={formatMoney(product.sellingPrice, settings.currency)} />
          <StatCard label="Profit / unit" value={formatMoney(profitPerUnit, settings.currency)} tone="accent" />
          <StatCard label="Margin" value={`${margin.toFixed(1)}%`} />
        </div>

        <div className="card-soft space-y-2 px-3 py-3 text-sm">
          <div className="flex flex-wrap gap-1">
            <Tag tone={stockStatus(product) === "In Stock" ? "ok" : stockStatus(product) === "Low Stock" ? "warn" : "bad"}>
              {stockStatus(product)}
            </Tag>
            {ex ? <Tag tone={ex === "Expired" ? "bad" : ex === "Expiring Soon" ? "warn" : "ok"}>{ex}</Tag> : null}
          </div>
          <Info label="SKU" value={product.sku || "-"} />
          <Info label="Barcode" value={product.barcode || "-"} />
          <Info label="Brand" value={product.brand || "-"} />
          <Info label="Animal type" value={product.animalType || "-"} />
          <Info label="Cost price" value={formatMoney(product.costPrice, settings.currency)} />
          <Info label="Minimum stock" value={String(product.minimumStock)} />
          <Info label="Supplier" value={supplier?.name || "-"} />
          <Info label="Expiry date" value={product.expiryDate ? formatDate(product.expiryDate) : "-"} />
          <Info label="Batch" value={product.batchNumber || "-"} />
          {product.notes ? <Info label="Notes" value={product.notes} /> : null}
        </div>

        <h2 className="pt-2 text-sm font-extrabold">Stock movements</h2>
        {movements.length === 0 ? (
          <p className="card-soft px-3 py-4 text-sm text-muted-foreground">
            No movements yet. Stock in, sales and adjustments will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <Row
                key={m.id}
                title={m.type}
                subtitle={`${formatDate(m.date)}${m.reason ? ` · ${m.reason}` : ""}`}
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
      <ProductDialog product={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[40%_minmax(0,1fr)] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-semibold">{value}</span>
    </div>
  );
}
