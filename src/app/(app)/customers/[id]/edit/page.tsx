import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/page";
import { CustomerForm } from "@/modules/customers/components/customer-form";
import type { CustomerFormInput } from "@/modules/customers/schema";

export const metadata = { title: "Edit Customer" };
export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customer.manage");
  const { id } = await params;

  const c = await db.customer.findUnique({ where: { id } });
  if (!c || c.isDeleted) notFound();

  const defaults: CustomerFormInput = {
    businessName: c.businessName,
    contactPerson: c.contactPerson ?? undefined,
    phone: c.phone ?? undefined,
    whatsapp: c.whatsapp ?? undefined,
    email: c.email ?? undefined,
    gstin: c.gstin ?? undefined,
    pan: c.pan ?? undefined,
    billingAddress: c.billingAddress ?? undefined,
    shippingAddress: c.shippingAddress ?? undefined,
    city: c.city ?? undefined,
    state: c.state ?? undefined,
    stateCode: c.stateCode ?? undefined,
    creditLimit: Number(c.creditLimit),
    creditDays: c.creditDays,
    defaultBillingMode: c.defaultBillingMode,
    defaultMakingType: c.defaultMakingType,
    defaultMakingRate: Number(c.defaultMakingRate),
    defaultGoldMargin: Number(c.defaultGoldMargin),
    defaultWastagePct: Number(c.defaultWastagePct),
    defaultDiscountPct: Number(c.defaultDiscountPct),
    defaultStoneRate: Number(c.defaultStoneRate),
    defaultDiamondRate: Number(c.defaultDiamondRate),
    openingCash: Number(c.openingCash),
    openingFine: Number(c.openingFine),
    status: c.status,
    notes: c.notes ?? undefined,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Edit ${c.businessName}`}
        subtitle={`Customer Code: ${c.code}`}
      />
      <CustomerForm id={c.id} defaults={defaults} />
    </div>
  );
}
