"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveCustomer } from "../actions";
import type { CustomerFormInput } from "../schema";

function F({ label, name, form, type = "text", hint, className = "", placeholder }: { label: string; name: keyof CustomerFormInput; form: ReturnType<typeof useForm<CustomerFormInput>>; type?: string; hint?: string; className?: string; placeholder?: string }) {
  const err = form.formState.errors[name]?.message as string | undefined;
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} type={type} step={type === "number" ? "any" : undefined} inputMode={type === "number" ? "decimal" : undefined} placeholder={placeholder}
        className={`field ${type === "number" ? "num" : ""} ${err ? "!border-danger" : ""}`} {...form.register(name)} />
      {err ? <p className="mt-1 text-xs text-danger">{err}</p> : hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card p-5 lg:p-6"><h2 className="mb-5 text-[16px] font-semibold">{title}</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div></section>;
}

export function CustomerForm({ id, defaults }: { id?: string; defaults?: CustomerFormInput }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [more, setMore] = useState(false);
  const form = useForm<CustomerFormInput>({
    defaultValues: { defaultBillingMode: "MONEY", defaultMakingType: "PER_GRAM", status: "ACTIVE", state: "Maharashtra", stateCode: "27", creditLimit: 0, creditDays: 0, defaultMakingRate: 0, openingCash: 0, openingFine: 0, ...defaults },
  });

  const submit = form.handleSubmit((values) =>
    start(async () => {
      const r = await saveCustomer(id ?? null, values);
      if (!r.ok) {
        Object.entries(r.fieldErrors ?? {}).forEach(([k, m]) => form.setError(k as keyof CustomerFormInput, { message: m }));
        toast.error(r.error);
        return;
      }
      toast.success(id ? "Customer updated" : "Customer added");
      router.push(`/customers/${r.data.id}`);
      router.refresh();
    }),
  );

  return (
    <form onSubmit={submit} className="space-y-4" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); submit(); } }}>
      <Card title="Customer">
        <F form={form} name="businessName" label="Business name *" className="lg:col-span-2" />
        <F form={form} name="contactPerson" label="Contact person" />
        <F form={form} name="phone" label="Phone" type="tel" />
        <F form={form} name="whatsapp" label="WhatsApp" type="tel" />
        <F form={form} name="email" label="Email" type="email" />
      </Card>

      <Card title="Tax & address">
        <F form={form} name="gstin" label="GSTIN" hint="15 characters" />
        <F form={form} name="pan" label="PAN" />
        <div />
        <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Billing address</label><textarea rows={2} className="field" {...form.register("billingAddress")} /></div>
          <div><label className="label">Shipping address</label><textarea rows={2} className="field" {...form.register("shippingAddress")} /></div>
        </div>
        <F form={form} name="city" label="City" />
        <F form={form} name="state" label="State" />
        <F form={form} name="stateCode" label="State code" hint="Decides CGST+SGST vs IGST (27 = Maharashtra)" />
      </Card>

      <Card title="Billing">
        <div>
          <label className="label">Default billing mode</label>
          <select className="field" {...form.register("defaultBillingMode")}>
            <option value="MONEY">Money billing</option>
            <option value="METAL">Metal + charges billing</option>
          </select>
        </div>
        <F form={form} name="creditLimit" label="Credit limit (₹)" type="number" />
        <F form={form} name="creditDays" label="Credit days" type="number" />
        <div>
          <label className="label">Default making type</label>
          <select className="field" {...form.register("defaultMakingType")}>
            <option value="PER_GRAM">Per gram</option><option value="PER_PIECE">Per piece</option><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option>
          </select>
        </div>
        <F form={form} name="defaultMakingRate" label="Default making rate" type="number" />
        <div>
          <label className="label">Status</label>
          <select className="field" {...form.register("status")}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLOCKED">Blocked</option></select>
        </div>
      </Card>

      <section className="card">
        <button type="button" onClick={() => setMore((m) => !m)} className="flex w-full items-center justify-between p-5 text-left text-[15px] font-semibold lg:px-6">
          More details — pricing profile & opening balances
          <ChevronDown size={18} className={`text-muted transition-transform ${more ? "rotate-180" : ""}`} />
        </button>
        {more && (
          <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
            <F form={form} name="defaultGoldMargin" label="Gold margin (₹/g)" type="number" />
            <F form={form} name="defaultWastagePct" label="Wastage %" type="number" />
            <F form={form} name="defaultDiscountPct" label="Discount %" type="number" />
            <F form={form} name="defaultStoneRate" label="Stone rate" type="number" />
            <F form={form} name="defaultDiamondRate" label="Diamond rate (₹/ct)" type="number" />
            <div />
            <F form={form} name="openingCash" label="Opening cash balance (₹)" type="number" hint="Positive = customer owes you (Dr)" />
            <F form={form} name="openingFine" label="Opening fine gold (g)" type="number" hint="Positive = customer owes you gold (Dr)" />
            <div className="sm:col-span-2 lg:col-span-3"><label className="label">Notes</label><textarea rows={2} className="field" {...form.register("notes")} /></div>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2 pb-4">
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
        <button className="btn btn-primary min-w-32" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} {id ? "Save changes" : "Add customer"}</button>
      </div>
    </form>
  );
}
