import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAll, uid, upsert, useData, type Customer } from "@/lib/db";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers & Pets — PetShop Managing Apps" },
      { name: "description", content: "Customer contacts with the pets that belong to them." },
      { property: "og:title", content: "Customers & Pets — PetShop Managing Apps" },
      { property: "og:description", content: "Customer contacts with the pets that belong to them." },
    ],
  }),
  component: Customers,
});

export function emptyCustomer(): Customer {
  return { id: uid(), name: "", phone: "", address: "", notes: "", createdAt: new Date().toISOString() };
}

export function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Customer | null>(customer);
  if (customer && (!draft || draft.id !== customer.id)) setDraft(customer);
  const set = (patch: Partial<Customer>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    upsert("customers", draft);
    toast.success("Customer saved.");
    onClose();
  };

  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customer</DialogTitle>
        </DialogHeader>
        {draft ? (
          <div className="space-y-3">
            <Field label="Name">
              <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Address">
              <Textarea rows={2} value={draft.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Notes">
              <Textarea rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
            <Button className="w-full" onClick={save}>
              Save customer
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Customers() {
  const ready = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);

  const customers = ready ? getAll("customers") : [];
  const pets = ready ? getAll("pets") : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => [c.name, c.phone].some((v) => (v || "").toLowerCase().includes(q)));
  }, [customers, query]);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer(s)`}
        back="/more"
        right={
          <Button size="sm" onClick={() => setEditing(emptyCustomer())}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />
      <Page>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No customers yet" hint="Add a customer to track their pets and purchases." icon={<Users className="h-6 w-6" />} />
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <Row
                key={c.id}
                onClick={() => navigate({ to: "/customer/$id", params: { id: c.id } })}
                title={c.name}
                subtitle={`${c.phone || "No phone"} · ${pets.filter((p) => p.customerId === c.id).length} pet(s)`}
              />
            ))}
          </div>
        )}
      </Page>

      <CustomerDialog customer={editing} onClose={() => setEditing(null)} />
    </>
  );
}
