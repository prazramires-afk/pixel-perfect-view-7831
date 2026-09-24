import { createFileRoute } from "@tanstack/react-router";
import { Download, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Field, Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearAll, download, exportAll, getSettings, importAll, saveSettings, type Settings } from "@/lib/db";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Backup — PetShop Managing Apps" },
      { name: "description", content: "Shop settings plus backup and restore of all your data." },
      { property: "og:title", content: "Settings & Backup — PetShop Managing Apps" },
      { property: "og:description", content: "Shop settings plus backup and restore of all your data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setS(getSettings()), []);
  if (!s) return null;

  const save = () => {
    saveSettings({ shopName: s.shopName, currency: s.currency, expiryWarningDays: Number(s.expiryWarningDays) || 30 });
    toast.success("Settings saved.");
  };

  const backup = () => {
    download(`petshop_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportAll(), null, 2));
    toast.success("Backup file downloaded.");
  };

  const restore = async (file: File) => {
    try {
      const res = importAll(JSON.parse(await file.text()));
      res.ok ? toast.success(res.message) : toast.error(res.message);
      if (res.ok) setS(getSettings());
    } catch {
      toast.error("Could not read this file.");
    }
  };

  const reset = () => {
    if (!confirm("Delete ALL data on this device? This cannot be undone.")) return;
    if (!confirm("Are you really sure? Make a backup first.")) return;
    clearAll();
    setS(getSettings());
    toast.success("All data cleared.");
  };

  return (
    <>
      <PageHeader title="Settings & backup" back="/more" />
      <Page>
        <div className="card-soft space-y-3 px-4 py-4">
          <Field label="Shop name"><Input value={s.shopName} onChange={(e) => setS({ ...s, shopName: e.target.value })} /></Field>
          <Field label="Currency symbol"><Input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} /></Field>
          <Field label="Expiry warning (days)">
            <Input type="number" value={s.expiryWarningDays} onChange={(e) => setS({ ...s, expiryWarningDays: Number(e.target.value) })} />
          </Field>
          <Button className="w-full" onClick={save}>Save settings</Button>
        </div>

        <div className="card-soft space-y-2 px-4 py-4">
          <p className="font-extrabold">Backup & restore</p>
          <p className="text-xs text-muted-foreground">All data is stored only on this device. Make regular backups.</p>
          <Button variant="outline" className="w-full" onClick={backup}><Download className="h-4 w-4" /> Download backup</Button>
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Restore from file</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }} />
          <Button variant="destructive" className="w-full" onClick={reset}><Trash2 className="h-4 w-4" /> Clear all data</Button>
        </div>
      </Page>
    </>
  );
}
