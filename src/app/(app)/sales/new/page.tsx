import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { SaleEntry } from "@/modules/sales/components/sale-entry";

export const metadata = { title: "New Sale" };
export const dynamic = "force-dynamic";

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const s = await requirePermission("sale.create");
  const { customer } = await searchParams;

  const [business, gstDefault, rates] = await Promise.all([
    db.business.findUnique({ where: { id: "main" } }),
    db.gstRate.findFirst({ where: { isDefault: true, isActive: true } }),
    db.metalRate.findMany({
      orderBy: { date: "desc" },
      distinct: ["purityId"],
      select: { purityId: true, ratePerGram: true },
    }),
  ]);

  const rateMap: Record<string, string> = {};
  for (const r of rates) {
    if (r.purityId) {
      rateMap[r.purityId] = r.ratePerGram.toString();
    }
  }

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <SaleEntry
      companyStateCode={business?.stateCode ?? "27"}
      defaultGst={gstDefault?.rate.toString() ?? "3"}
      rates={rateMap}
      gramsPerCarat={business?.gramsPerCarat.toString() ?? "0.2"}
      roundOff={business?.roundOffInvoice ?? false}
      taxMetal={business?.taxMetalValueInMetalMode ?? false}
      canOverrideNet={s.can("weight.override_net")}
      initialCustomerId={customer}
      today={todayStr}
    />
  );
}
