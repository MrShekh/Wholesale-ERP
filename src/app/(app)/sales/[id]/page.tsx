import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { InvoiceView, type InvoiceData } from "@/modules/sales/components/invoice-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await db.sale.findUnique({ where: { id }, select: { number: true } });
  return { title: s ? `Invoice ${s.number}` : "Invoice" };
}

export default async function SaleInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission("sale.view");
  const { id } = await params;

  const [sale, business] = await Promise.all([
    db.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { lineNo: "asc" } },
      },
    }),
    db.business.findUnique({ where: { id: "main" } }),
  ]);

  if (!sale || !business) {
    notFound();
  }

  const invoiceData: InvoiceData = {
    id: sale.id,
    number: sale.number,
    date: sale.date.toISOString(),
    dueDate: sale.dueDate ? sale.dueDate.toISOString() : null,
    status: sale.status,
    billingMode: sale.billingMode,
    placeOfSupplyState: sale.placeOfSupplyState,
    placeOfSupplyCode: sale.placeOfSupplyCode,
    isInterState: sale.isInterState,
    gstRate: sale.gstRate.toString(),
    totalPieces: sale.totalPieces,
    grossWeight: sale.grossWeight.toString(),
    stoneWeight: sale.stoneWeight.toString(),
    otherWeight: sale.otherWeight.toString(),
    netWeight: sale.netWeight.toString(),
    fineWeight: sale.fineWeight.toString(),
    goldValue: sale.goldValue.toString(),
    makingAmount: sale.makingAmount.toString(),
    stoneAmount: sale.stoneAmount.toString(),
    otherCharges: sale.otherCharges.toString(),
    discount: sale.discount.toString(),
    taxableAmount: sale.taxableAmount.toString(),
    cgst: sale.cgst.toString(),
    sgst: sale.sgst.toString(),
    igst: sale.igst.toString(),
    gstAmount: sale.gstAmount.toString(),
    roundOff: sale.roundOff.toString(),
    grandTotal: sale.grandTotal.toString(),
    metalLedgerImpact: sale.metalLedgerImpact.toString(),
    moneyLedgerImpact: sale.moneyLedgerImpact.toString(),
    notes: sale.notes,
    terms: sale.terms,
    cancelledAt: sale.cancelledAt ? sale.cancelledAt.toISOString() : null,
    cancelReason: sale.cancelReason,
    customer: {
      id: sale.customer.id,
      code: sale.customer.code,
      businessName: sale.customer.businessName,
      contactPerson: sale.customer.contactPerson,
      phone: sale.customer.phone,
      gstin: sale.customer.gstin,
      pan: sale.customer.pan,
      billingAddress: sale.customer.billingAddress,
      shippingAddress: sale.customer.shippingAddress,
      state: sale.customer.state,
      stateCode: sale.customer.stateCode,
    },
    business: {
      name: business.name,
      legalName: business.legalName,
      gstin: business.gstin,
      pan: business.pan,
      address: business.address,
      city: business.city,
      state: business.state,
      stateCode: business.stateCode,
      phone: business.phone,
      email: business.email,
      bankName: business.bankName,
      accountNumber: business.accountNumber,
      ifsc: business.ifsc,
      upi: business.upi,
      terms: business.terms,
    },
    items: sale.items.map((it) => ({
      id: it.id,
      lineNo: it.lineNo,
      description: it.description,
      designNo: it.designNo,
      hsn: it.hsn,
      pieces: it.pieces,
      grossWeight: it.grossWeight.toString(),
      stoneWeight: it.stoneWeight.toString(),
      otherWeight: it.otherWeight.toString(),
      netWeight: it.netWeight.toString(),
      touch: it.touch.toString(),
      fineWeight: it.fineWeight.toString(),
      goldRate: it.goldRate.toString(),
      makingType: it.makingType,
      makingRate: it.makingRate.toString(),
      makingAmount: it.makingAmount.toString(),
      stoneAmount: it.stoneAmount.toString(),
      otherCharges: it.otherCharges.toString(),
      discount: it.discount.toString(),
      taxableAmount: it.taxableAmount.toString(),
      gstAmount: it.gstAmount.toString(),
      lineTotal: it.lineTotal.toString(),
    })),
  };

  return <InvoiceView sale={invoiceData} canCancel={s.can("sale.cancel")} />;
}
