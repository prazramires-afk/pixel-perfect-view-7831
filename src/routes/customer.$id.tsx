import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PawPrint, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row, Selector } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ANIMAL_TYPES, formatDate, formatMoney, getAll, remove, uid, upsert, useData, type Pet } from "@/lib/db";
import { CustomerDialog } from "./customers";

export const Route = createFileRoute("/customer/$id")({
  head: () => ({
    meta: [
      { title: "Customer Details — PetShop Managing Apps" },
      { name: "description", content: "Customer info, their pets and purchase history." },
      { property: "og:title", content: "Customer Details — PetShop Managing Apps" },
      { property: "og:description", content: "Customer info, their pets and purchase history." },
    ],
  }),
  component: CustomerDetail,
});

function PetDialog({ pet, onClose }: { pet: Pet | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Pet | null>(pet);
  if (pet && (!draft || draft.id !== pet.id)) setDraft(pet);
  const set = (p: Partial<Pet>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const save = () => {
    if (!draft?.name.trim()) { toast.error("Pet name is required."); return; }
    upsert("pets", draft);
    toast.success("Pet saved.");
    onClose();
  };
  return (
    <Dialog open={!!pet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pet</DialogTitle>
        </DialogHeader>
        {draft ? (
          <div className="space-y-3">
            <Field label="Name"><Input value={draft.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Species">
                <Selector value={draft.species} onChange={(v) => set({ species: v })} options={ANIMAL_TYPES.map((a) => ({ value: a, label: a }))} placeholder="Select" />
              </Field>
              <Field label="Breed"><Input value={draft.breed} onChange={(e) => set({ breed: e.target.value })} /></Field>
              <Field label="Gender">
                <Selector value={draft.gender} onChange={(v) => set({ gender: v })} options={["Male", "Female", "Unknown"].map((a) => ({ value: a, label: a }))} placeholder="Select" />
              </Field>
              <Field label="Birthday"><Input type="date" value={draft.birthday} onChange={(e) => set({ birthday: e.target.value })} /></Field>
              <Field label="Weight"><Input value={draft.weight} onChange={(e) => set({ weight: e.target.value })} placeholder="e.g. 4 kg" /></Field>
              <Field label="Color"><Input value={draft.color} onChange={(e) => set({ color: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
            <Button className="w-full" onClick={save}>Save pet</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetail() {
  const { id } = Route.useParams();
  const ready = useData();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [pet, setPet] = useState<Pet | null>(null);
  if (!ready) return null;
  const customer = getAll("customers").find((c) => c.id === id);
  if (!customer) {
    return (
      <>
        <PageHeader title="Customer" back="/customers" />
        <Page><EmptyState title="Customer not found" hint="It may have been deleted." /></Page>
      </>
    );
  }
  const pets = getAll("pets").filter((p) => p.customerId === id);
  const sales = getAll("sales").filter((s) => s.customerId === id);
  const spent = sales.reduce((a, s) => a + s.total, 0);

  const del = () => {
    if (!confirm("Delete this customer and their pets?")) return;
    pets.forEach((p) => remove("pets", p.id));
    remove("customers", id);
    toast.success("Customer deleted.");
    navigate({ to: "/customers" });
  };

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={customer.phone || "No phone"}
        back="/customers"
        right={
          <div className="flex gap-1">
            <Button size="icon" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" onClick={del}><Trash2 className="h-4 w-4" /></Button>
          </div>
        }
      />
      <Page>
        <div className="card-soft space-y-1 px-4 py-3 text-sm">
          <p><span className="text-muted-foreground">Address: </span>{customer.address || "-"}</p>
          <p><span className="text-muted-foreground">Notes: </span>{customer.notes || "-"}</p>
          <p><span className="text-muted-foreground">Total spent: </span><b>{formatMoney(spent)}</b> ({sales.length} sale(s))</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <h2 className="font-extrabold">Pets</h2>
          <Button size="sm" onClick={() => setPet({ id: uid(), customerId: id, name: "", species: "", breed: "", gender: "", birthday: "", weight: "", color: "", notes: "" })}>
            <Plus className="h-4 w-4" /> Add pet
          </Button>
        </div>
        {pets.length === 0 ? (
          <EmptyState title="No pets yet" hint="Add this customer's pets." icon={<PawPrint className="h-6 w-6" />} />
        ) : (
          pets.map((p) => (
            <Row
              key={p.id}
              onClick={() => setPet(p)}
              title={p.name}
              subtitle={[p.species, p.breed, p.gender, p.weight].filter(Boolean).join(" · ") || "No details"}
              right={
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("Delete pet?")) remove("pets", p.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          ))
        )}

        <h2 className="pt-2 font-extrabold">Purchase history</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases yet.</p>
        ) : (
          sales.map((s) => (
            <Link key={s.id} to="/sale/$id" params={{ id: s.id }} className="block">
              <Row title={s.invoiceNumber} subtitle={formatDate(s.createdAt)} right={<b>{formatMoney(s.total)}</b>} />
            </Link>
          ))
        )}
      </Page>
      <CustomerDialog customer={editing ? customer : null} onClose={() => setEditing(false)} />
      <PetDialog pet={pet} onClose={() => setPet(null)} />
    </>
  );
}
