import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAll, remove, uid, upsert, useData, type Supplier } from "@/lib/db";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — PetShop Managing Apps" },
      { name: "description", content: "Keep supplier contacts and addresses for restocking your shop." },
      { property: "og:title", content: "Suppliers — PetShop Managing Apps" },
      { property: "og:description", content: "Keep supplier contacts and addresses for restocking your shop." },
    ],
  }),
  component: Suppliers,
});

function empty(): Supplier {
  return { id: uid(), name: "", contact: "", phone: "", email: "", address: "", notes: "" };
}

function Suppliers() {
  const ready = useData();
  const [draft, setDraft] = useState<Supplier | null>(null);
  const suppliers = ready ? getAll("suppliers") : [];
  const set = (patch: Partial<Supplier>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }
    upsert("suppliers", draft);
    toast.success("Supplier saved.");
    setDraft(null);
  };

  const del = (s: Supplier) => {
    if (!confirm(`Delete ${s.name}?`)) return;
    remove("suppliers", s.id);
    toast.success("Supplier deleted.");
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} supplier(s)`}
        back="/more"
        right={
          <Button size="sm" onClick={() => setDraft(empty())}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />
      <Page>
        {suppliers.length === 0 ? (
          <EmptyState title="No suppliers yet" hint="Add the shops and distributors you buy from." icon={<Truck className="h-6 w-6" />} />
        ) : (
          <div className="space-y-2">
            {suppliers.map((s) => (
              <Row
                key={s.id}
                onClick={() => setDraft(s)}
                title={s.name}
                subtitle={[s.contact, s.phone].filter(Boolean).join(" · ") || "No contact details"}
                right={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      del(s);
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
              />
            ))}
          </div>
        )}
      </Page>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supplier</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <Field label="Name">
                <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Contact person">
                  <Input value={draft.contact} onChange={(e) => set({ contact: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <Input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
              </div>
              <Field label="Email">
                <Input value={draft.email} onChange={(e) => set({ email: e.target.value })} />
              </Field>
              <Field label="Address">
                <Textarea rows={2} value={draft.address} onChange={(e) => set({ address: e.target.value })} />
              </Field>
              <Field label="Notes">
                <Textarea rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
              </Field>
              <Button className="w-full" onClick={save}>
                Save supplier
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
