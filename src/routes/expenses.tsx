import { createFileRoute } from "@tanstack/react-router";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, Field, Page, PageHeader, Row, Selector, StatCard } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EXPENSE_CATEGORIES, formatDate, formatMoney, getAll, remove, uid, upsert, useData, type Expense } from "@/lib/db";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — PetShop Managing Apps" },
      { name: "description", content: "Record shop expenses like rent, electricity and salaries." },
      { property: "og:title", content: "Expenses — PetShop Managing Apps" },
      { property: "og:description", content: "Record shop expenses like rent, electricity and salaries." },
    ],
  }),
  component: Expenses,
});

function Expenses() {
  const ready = useData();
  const [draft, setDraft] = useState<Expense | null>(null);
  const expenses = ready ? [...getAll("expenses")].sort((a, b) => b.date.localeCompare(a.date)) : [];
  const month = new Date().toISOString().slice(0, 7);
  const monthTotal = expenses.filter((e) => e.date.startsWith(month)).reduce((a, e) => a + e.amount, 0);
  const set = (p: Partial<Expense>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const save = () => {
    if (!draft) return;
    if (!draft.amount || draft.amount <= 0) { toast.error("Enter an amount."); return; }
    upsert("expenses", draft);
    toast.success("Expense saved.");
    setDraft(null);
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        back="/more"
        right={
          <Button size="sm" onClick={() => setDraft({ id: uid(), category: "Other", amount: 0, date: new Date().toISOString().slice(0, 10), description: "" })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />
      <Page>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="This month" value={formatMoney(monthTotal)} tone="accent" />
          <StatCard label="All time" value={formatMoney(expenses.reduce((a, e) => a + e.amount, 0))} />
        </div>
        {expenses.length === 0 ? (
          <EmptyState title="No expenses yet" hint="Tap Add to record an expense." icon={<Receipt className="h-6 w-6" />} />
        ) : (
          expenses.map((e) => (
            <Row
              key={e.id}
              onClick={() => setDraft(e)}
              title={e.category}
              subtitle={`${formatDate(e.date)}${e.description ? " · " + e.description : ""}`}
              right={
                <div className="flex items-center gap-1">
                  <b>{formatMoney(e.amount)}</b>
                  <Button size="icon" variant="ghost" onClick={(ev) => { ev.stopPropagation(); if (confirm("Delete expense?")) remove("expenses", e.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
          ))
        )}
      </Page>
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Expense</DialogTitle></DialogHeader>
          {draft ? (
            <div className="space-y-3">
              <Field label="Category">
                <Selector value={draft.category} onChange={(v) => set({ category: v })} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
              </Field>
              <Field label="Amount">
                <Input type="number" inputMode="numeric" value={draft.amount || ""} onChange={(e) => set({ amount: Number(e.target.value) })} />
              </Field>
              <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} /></Field>
              <Field label="Description"><Textarea rows={2} value={draft.description} onChange={(e) => set({ description: e.target.value })} /></Field>
              <Button className="w-full" onClick={save}>Save expense</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
