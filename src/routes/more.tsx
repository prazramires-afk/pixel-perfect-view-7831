import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ClipboardList, Receipt, Settings, ShoppingBag, Truck, Users, Warehouse } from "lucide-react";

import { Page, PageHeader } from "@/components/shell";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — PetShop Managing Apps" },
      { name: "description", content: "Inventory, purchases, suppliers, customers, expenses and settings." },
      { property: "og:title", content: "More — PetShop Managing Apps" },
      { property: "og:description", content: "Inventory, purchases, suppliers, customers, expenses and settings." },
    ],
  }),
  component: More,
});

const ITEMS = [
  { to: "/inventory", label: "Inventory & stock", hint: "Stock in/out, adjustments, history", icon: Warehouse },
  { to: "/purchases", label: "Purchases", hint: "Buy stock from suppliers", icon: ShoppingBag },
  { to: "/suppliers", label: "Suppliers", hint: "Supplier contacts", icon: Truck },
  { to: "/customers", label: "Customers & pets", hint: "Customers and their pets", icon: Users },
  { to: "/expenses", label: "Expenses", hint: "Rent, bills, salaries", icon: Receipt },
  { to: "/sales", label: "Sales history", hint: "All invoices", icon: ClipboardList },
  { to: "/settings", label: "Settings & backup", hint: "Shop info, backup, restore", icon: Settings },
] as const;

function More() {
  return (
    <>
      <PageHeader title="More" />
      <Page>
        {ITEMS.map(({ to, label, hint, icon: Icon }) => (
          <Link key={to} to={to} className="card-soft flex items-center gap-3 px-3 py-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </Page>
    </>
  );
}
