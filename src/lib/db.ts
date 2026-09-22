import { useEffect, useState } from "react";

/* ---------------- Types ---------------- */

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  brand: string;
  animalType: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  supplierId: string;
  expiryDate: string;
  batchNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SaleItem = {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  subtotal: number;
};

export type Sale = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
};

export type PurchaseItem = {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
};

export type Purchase = {
  id: string;
  supplierId: string;
  items: PurchaseItem[];
  total: number;
  date: string;
  notes: string;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type Pet = {
  id: string;
  customerId: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  birthday: string;
  weight: string;
  color: string;
  notes: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export type MovementType = "PURCHASE" | "SALE" | "ADJUSTMENT" | "DAMAGE" | "EXPIRED" | "RETURN";

export type StockMovement = {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number; // signed: + increases stock, - decreases
  reason: string;
  referenceId: string;
  date: string;
};

export type Category = { id: string; name: string };

export type Settings = {
  shopName: string;
  currency: string;
  expiryWarningDays: number;
  invoiceCounter: number;
};

/* ---------------- Constants ---------------- */

export const DEFAULT_CATEGORIES = [
  "Pet Food",
  "Treats",
  "Vitamins & Supplements",
  "Pet Medicine",
  "Flea & Tick",
  "Grooming",
  "Toys",
  "Collars & Leashes",
  "Accessories",
  "Cage & Habitat",
  "Hygiene & Cleaning",
  "Other",
];

export const ANIMAL_TYPES = ["Dog", "Cat", "Bird", "Fish", "Rabbit", "Other"];
export const PAYMENT_METHODS = ["Cash", "Transfer", "QRIS", "Other"];
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Water",
  "Internet",
  "Transportation",
  "Salary",
  "Packaging",
  "Cleaning",
  "Equipment",
  "Other",
];

const DEFAULT_SETTINGS: Settings = {
  shopName: "My Pet Shop",
  currency: "Rp",
  expiryWarningDays: 30,
  invoiceCounter: 0,
};

/* ---------------- Storage core ---------------- */

const KEYS = {
  products: "petshop_products",
  sales: "petshop_sales",
  purchases: "petshop_purchases",
  expenses: "petshop_expenses",
  customers: "petshop_customers",
  pets: "petshop_pets",
  suppliers: "petshop_suppliers",
  categories: "petshop_categories",
  movements: "petshop_stock_movements",
  settings: "petshop_settings",
} as const;

export type CollectionName = Exclude<keyof typeof KEYS, "settings">;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

function readRaw<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeRaw(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
  emit();
}

type Shapes = {
  products: Product;
  sales: Sale;
  purchases: Purchase;
  expenses: Expense;
  customers: Customer;
  pets: Pet;
  suppliers: Supplier;
  categories: Category;
  movements: StockMovement;
};

export function getAll<K extends CollectionName>(name: K): Shapes[K][] {
  const data = readRaw<Shapes[K][]>(KEYS[name], []);
  return Array.isArray(data) ? data : [];
}

export function setAll<K extends CollectionName>(name: K, rows: Shapes[K][]) {
  writeRaw(KEYS[name], rows);
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readRaw<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(patch: Partial<Settings>) {
  writeRaw(KEYS.settings, { ...getSettings(), ...patch });
}

export function getCategories(): Category[] {
  const rows = getAll("categories");
  if (rows.length) return rows;
  const seeded = DEFAULT_CATEGORIES.map((name) => ({ id: name.toLowerCase().replace(/\W+/g, "-"), name }));
  return seeded;
}

export function saveCategories(rows: Category[]) {
  setAll("categories", rows);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ---------------- Generic CRUD ---------------- */

export function upsert<K extends CollectionName>(name: K, row: Shapes[K]) {
  const rows = getAll(name);
  const i = rows.findIndex((r) => (r as { id: string }).id === (row as { id: string }).id);
  if (i >= 0) rows[i] = row;
  else rows.unshift(row);
  setAll(name, rows);
}

export function remove<K extends CollectionName>(name: K, id: string) {
  setAll(
    name,
    getAll(name).filter((r) => (r as { id: string }).id !== id),
  );
}

/* ---------------- Stock helpers ---------------- */

export function recordMovement(m: Omit<StockMovement, "id" | "date"> & { date?: string }) {
  const movements = getAll("movements");
  movements.unshift({ id: uid(), date: m.date ?? new Date().toISOString(), ...m });
  setAll("movements", movements);
}

/** Changes stock AND always records a movement. */
export function applyStockChange(opts: {
  productId: string;
  delta: number;
  type: MovementType;
  reason?: string;
  referenceId?: string;
}) {
  const products = getAll("products");
  const i = products.findIndex((p) => p.id === opts.productId);
  const existing = products[i];
  if (existing) {
    products[i] = {
      ...existing,
      stock: Math.max(0, (existing.stock || 0) + opts.delta),
      updatedAt: new Date().toISOString(),
    };
    setAll("products", products);
  }
  recordMovement({
    productId: opts.productId,
    type: opts.type,
    quantity: opts.delta,
    reason: opts.reason ?? "",
    referenceId: opts.referenceId ?? "",
  });
}

export function nextInvoiceNumber() {
  const s = getSettings();
  const next = (s.invoiceCounter || 0) + 1;
  saveSettings({ invoiceCounter: next });
  return "INV-" + String(next).padStart(6, "0");
}

/* ---------------- Derived helpers ---------------- */

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
export function stockStatus(p: Product): StockStatus {
  if (!p.stock || p.stock <= 0) return "Out of Stock";
  if (p.stock <= (p.minimumStock || 0)) return "Low Stock";
  return "In Stock";
}

export type ExpiryStatus = "Normal" | "Expiring Soon" | "Expired" | null;
export function expiryStatus(p: Product, warningDays = 30): ExpiryStatus {
  if (!p.expiryDate) return null;
  const days = daysUntil(p.expiryDate);
  if (days < 0) return "Expired";
  if (days <= warningDays) return "Expiring Soon";
  return "Normal";
}

export function daysUntil(dateStr: string) {
  const d = new Date(dateStr + (dateStr.length <= 10 ? "T00:00:00" : ""));
  return Math.floor((d.getTime() - startOfDay(new Date()).getTime()) / 86400000);
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(iso: string, day = new Date()) {
  const d = new Date(iso);
  return d.toDateString() === day.toDateString();
}

export function saleProfit(s: Sale) {
  const gross = s.items.reduce((a, it) => a + (it.sellingPrice - it.costPrice) * it.quantity, 0);
  return gross - (s.discount || 0);
}

export function formatMoney(n: number, currency = getSettings().currency) {
  const v = Math.round(n || 0);
  return `${currency} ${v.toLocaleString("id-ID")}`;
}

export function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------------- Backup ---------------- */

export function exportAll() {
  const data: Record<string, unknown> = { __app: "PetShop Managing Apps", __version: 1 };
  (Object.keys(KEYS) as (keyof typeof KEYS)[]).forEach((k) => {
    data[KEYS[k]] = k === "settings" ? getSettings() : getAll(k as CollectionName);
  });
  return data;
}

export function importAll(parsed: unknown): { ok: boolean; message: string } {
  if (!parsed || typeof parsed !== "object") return { ok: false, message: "Invalid backup file." };
  const obj = parsed as Record<string, unknown>;
  const collectionKeys = (Object.keys(KEYS) as (keyof typeof KEYS)[]).filter((k) => k !== "settings");
  const hasAny = collectionKeys.some((k) => Array.isArray(obj[KEYS[k]]));
  if (!hasAny) return { ok: false, message: "This file does not look like a PetShop backup." };
  collectionKeys.forEach((k) => {
    const value = obj[KEYS[k]];
    if (Array.isArray(value)) setAll(k as CollectionName, value as never);
  });
  if (obj[KEYS.settings] && typeof obj[KEYS.settings] === "object") {
    writeRaw(KEYS.settings, { ...DEFAULT_SETTINGS, ...(obj[KEYS.settings] as object) });
  }
  emit();
  return { ok: true, message: "Backup restored successfully." };
}

export function clearAll() {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  emit();
}

export function download(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/* ---------------- React binding ---------------- */

/** Returns true once mounted; re-renders the component on any data change. */
export function useData() {
  const [, bump] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const l = () => bump((v) => v + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return ready;
}
