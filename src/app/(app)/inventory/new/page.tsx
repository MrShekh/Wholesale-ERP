import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/page";
import { ProductForm } from "@/modules/inventory/components/product-form";

export const metadata = { title: "Add Stock Item" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requirePermission("inventory.manage");

  const [categories, purities, suppliers, locations, lastItem] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.purity.findMany({ where: { isActive: true }, orderBy: { touch: "desc" } }),
    db.supplier.findMany({ where: { isDeleted: false }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
    db.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.product.findFirst({ orderBy: { createdAt: "desc" }, select: { itemCode: true } }),
  ]);

  let nextCode = "T0001";
  if (lastItem?.itemCode) {
    const numMatch = lastItem.itemCode.match(/\d+/);
    if (numMatch) {
      const n = parseInt(numMatch[0], 10) + 1;
      nextCode = `T${String(n).padStart(4, "0")}`;
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Add Jewellery Stock Item"
        subtitle="Record individual stock pieces or lots with precise weight and purity calculation"
      />
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        purities={purities.map((p) => ({ id: p.id, name: p.name, touch: p.touch.toString() }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.companyName }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        suggestedCode={nextCode}
      />
    </div>
  );
}
