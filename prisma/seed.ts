import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";
import { SYSTEM_ROLES } from "../src/lib/auth/permissions";
import { calculateFineWeight, calculateNetWeight, calculateStones } from "../src/lib/calculations/weight";
import { postSale } from "../src/lib/accounting/post-sale";
import { postCashReceipt, postGoldReceipt, postRateFixing } from "../src/lib/accounting/post-receipts";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@demo.com";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe@123";

async function main() {
  console.log("Seeding reference data…");

  // Roles
  for (const [name, r] of Object.entries(SYSTEM_ROLES)) {
    await db.role.upsert({
      where: { name },
      create: { name, description: r.description, permissions: r.permissions, isSystem: true },
      update: { description: r.description, permissions: r.permissions },
    });
  }
  const ownerRole = await db.role.findUniqueOrThrow({ where: { name: "Owner" } });

  // Owner user
  let owner = await db.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    owner = await db.user.create({ data: { id: crypto.randomUUID(), name: "Owner", email: OWNER_EMAIL, emailVerified: true, roleId: ownerRole.id } });
    await db.account.create({ data: { id: crypto.randomUUID(), accountId: owner.id, providerId: "credential", userId: owner.id, password: await hashPassword(OWNER_PASSWORD) } });
  }

  await db.business.upsert({
    where: { id: "main" },
    create: {
      id: "main", name: "Shree Ganesh Jewellers", legalName: "Shree Ganesh Jewellers Pvt. Ltd.", gstin: "27AABCS1234F1Z5", pan: "AABCS1234F",
      address: "Shop 12, Sarafa Bazaar, Budhwar Peth", city: "Pune", state: "Maharashtra", stateCode: "27", pincode: "411002",
      phone: "+91 20 2445 0000", email: "accounts@shreeganesh.example", bankName: "HDFC Bank", accountNumber: "50200012345678", ifsc: "HDFC0000123", upi: "shreeganesh@hdfcbank",
      terms: "1. Goods once sold will not be taken back without prior approval.\n2. Interest @18% p.a. on overdue payments.\n3. Subject to Pune jurisdiction.",
    },
    update: {},
  });

  await db.financialYear.upsert({ where: { label: "26-27" }, create: { label: "26-27", startDate: new Date("2026-04-01"), endDate: new Date("2027-03-31"), isCurrent: true }, update: {} });
  await db.gstRate.upsert({ where: { id: "gst-3" }, create: { id: "gst-3", name: "Jewellery 3%", hsn: "7113", rate: 3, isDefault: true }, update: {} });
  await db.gstRate.upsert({ where: { id: "gst-5" }, create: { id: "gst-5", name: "Making charges 5%", hsn: "9988", rate: 5 }, update: {} });

  const gold = await db.metal.upsert({ where: { name: "Gold" }, create: { name: "Gold", symbol: "Au" }, update: {} });
  const silver = await db.metal.upsert({ where: { name: "Silver" }, create: { name: "Silver", symbol: "Ag" }, update: {} });
  await db.metal.upsert({ where: { name: "Platinum" }, create: { name: "Platinum", symbol: "Pt" }, update: {} });

  const purityDefs: [string, string | null, number][] = [["24K", "24", 99.9], ["22K", "22", 91.6], ["22K (92)", "22", 92], ["18K", "18", 75], ["18K (76)", "18", 76], ["14K", "14", 58.5]];
  const purities: Record<string, string> = {};
  for (const [name, karat, touch] of purityDefs) {
    const p = await db.purity.upsert({ where: { metalId_name: { metalId: gold.id, name } }, create: { metalId: gold.id, name, karat, touch }, update: {} });
    purities[name] = p.id;
  }
  const s925 = await db.purity.upsert({ where: { metalId_name: { metalId: silver.id, name: "Sterling 92.5" } }, create: { metalId: silver.id, name: "Sterling 92.5", touch: 92.5 }, update: {} });
  void s925;

  const catNames = ["Ring", "Earring", "Pendant", "Chain", "Bracelet", "Bangle", "Necklace", "Mangalsutra", "Set", "Loose Stone", "Gold Bar", "Silver Article", "Other"];
  const cats: Record<string, string> = {};
  for (const [i, name] of catNames.entries()) cats[name] = (await db.category.upsert({ where: { name }, create: { name, sortOrder: i }, update: {} })).id;

  for (const [name, precious] of [["Diamond", true], ["Ruby", true], ["Emerald", true], ["Pearl", false], ["CZ", false], ["Other", false]] as const)
    await db.stoneType.upsert({ where: { name }, create: { name, isPrecious: precious }, update: {} });

  const main = await db.location.upsert({ where: { name: "Main Office" }, create: { name: "Main Office", isDefault: true }, update: {} });
  await db.location.upsert({ where: { name: "Showroom" }, create: { name: "Showroom", type: "SHOWROOM" }, update: {} });
  await db.priceGroup.upsert({ where: { name: "Wholesale A" }, create: { name: "Wholesale A" }, update: {} });

  const today = new Date();
  const d0 = today.toISOString().slice(0, 10);
  const rateRows: [string, string, number][] = [["22K", "22K", 7850], ["24K", "24K", 8560], ["18K", "18K", 6420]];
  const hasRates = await db.metalRate.count();
  if (!hasRates) for (const [, pn, rate] of rateRows) await db.metalRate.create({ data: { metalId: gold.id, purityId: purities[pn], date: new Date(d0), ratePerGram: rate, source: "Manual" } });

  if (process.env.SEED_DEMO !== "true") {
    console.log(`\nFresh & clean database ready! All masters & owner account prepared.`);
    console.log(`Login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}\n`);
    return;
  }

  if (await db.customer.count()) {
    console.log("Demo data already present — skipping.");
    return;
  }

  // Parties
  const raj = await db.customer.create({ data: { code: "C0001", businessName: "Raj Jewellers", contactPerson: "Rajesh Shah", phone: "9822011111", whatsapp: "9822011111", gstin: "27AAACR1111A1Z2", city: "Pune", state: "Maharashtra", stateCode: "27", billingAddress: "Laxmi Road, Pune 411030", creditLimit: 2500000, creditDays: 30, defaultBillingMode: "METAL", defaultMakingType: "PER_GRAM", defaultMakingRate: 450, openingCash: 120000, openingFine: 45.25 } });
  const shree = await db.customer.create({ data: { code: "C0002", businessName: "Shree Gold", contactPerson: "Mahesh Jain", phone: "9890022222", gstin: "27AAACS2222B1Z4", city: "Kolhapur", state: "Maharashtra", stateCode: "27", creditLimit: 1500000, creditDays: 15, defaultBillingMode: "MONEY", defaultMakingType: "PER_GRAM", defaultMakingRate: 520 } });
  const maha = await db.customer.create({ data: { code: "C0003", businessName: "Mahalaxmi Jewellers", contactPerson: "Kiran Patel", phone: "9979033333", gstin: "24AAACM3333C1Z6", city: "Surat", state: "Gujarat", stateCode: "24", creditLimit: 3000000, creditDays: 45, defaultBillingMode: "METAL", defaultMakingType: "PER_GRAM", defaultMakingRate: 400 } });
  const abc = await db.supplier.create({ data: { code: "S0001", companyName: "ABC Jewellery Manufacturing", contactPerson: "Anil Bhosale", phone: "9850044444", gstin: "27AAACA4444D1Z8", city: "Mumbai", state: "Maharashtra", stateCode: "27", paymentTerms: "30 days", openingFine: 120.5 } });
  const sk = await db.supplier.create({ data: { code: "S0002", companyName: "SK Gold", contactPerson: "Suresh Kulkarni", phone: "9822055555", gstin: "27AAACS5555E1Z1", city: "Pune", state: "Maharashtra", stateCode: "27", paymentTerms: "Immediate" } });

  // Opening ledger rows so the ledgers reconcile with openings
  await db.customerMetalLedger.create({ data: { customerId: raj.id, txnType: "OPENING", debitFine: 0, remarks: "Opening carried in customer master" } });

  // Products
  type Spec = { code: string; design: string; name: string; cat: string; purity: string; pieces: number; gross: number; other?: number; supplier: string; stones?: { stoneName: string; pieces: number; weight: number; unit: "CARAT" | "GRAM"; method: "PER_CARAT" | "PER_GRAM"; rate: number }[]; cost: number; barcode: string };
  const specs: Spec[] = [
    { code: "T0001", design: "DR-1021", name: "18K Diamond Ring", cat: "Ring", purity: "18K", pieces: 1, gross: 5.8, supplier: abc.id, stones: [{ stoneName: "Diamond", pieces: 12, weight: 0.45, unit: "CARAT", method: "PER_CARAT", rate: 45000 }], cost: 38900, barcode: "890100000011" },
    { code: "T0002", design: "DR-1022", name: "18K Diamond Ring", cat: "Ring", purity: "18K", pieces: 1, gross: 6.4, supplier: abc.id, stones: [{ stoneName: "Diamond", pieces: 16, weight: 0.62, unit: "CARAT", method: "PER_CARAT", rate: 45000 }], cost: 46200, barcode: "890100000028" },
    { code: "T0003", design: "CH-2201", name: "22K Gold Chain", cat: "Chain", purity: "22K", pieces: 1, gross: 24.55, supplier: sk.id, cost: 195000, barcode: "890100000035" },
    { code: "T0004", design: "CH-2202", name: "22K Gold Chain", cat: "Chain", purity: "22K", pieces: 1, gross: 18.2, supplier: sk.id, cost: 144000, barcode: "890100000042" },
    { code: "T0005", design: "PN-3105", name: "18K Pendant", cat: "Pendant", purity: "18K", pieces: 1, gross: 4.25, other: 0.1, supplier: abc.id, stones: [{ stoneName: "Diamond", pieces: 9, weight: 0.3, unit: "CARAT", method: "PER_CARAT", rate: 42000 }], cost: 26400, barcode: "890100000059" },
    { code: "T0006", design: "BR-4410", name: "22K Bracelet", cat: "Bracelet", purity: "22K", pieces: 1, gross: 32.8, supplier: sk.id, cost: 262000, barcode: "890100000066" },
    { code: "T0007", design: "BG-5501", name: "22K Bangle", cat: "Bangle", purity: "22K", pieces: 2, gross: 41.3, supplier: sk.id, cost: 331000, barcode: "890100000073" },
    { code: "T0008", design: "ER-6102", name: "22K Earring", cat: "Earring", purity: "22K", pieces: 2, gross: 9.15, other: 0.2, supplier: abc.id, stones: [{ stoneName: "Pearl", pieces: 2, weight: 0.9, unit: "GRAM", method: "PER_GRAM", rate: 400 }], cost: 74000, barcode: "890100000080" },
  ];
  const products: Record<string, string> = {};
  for (const s of specs) {
    const stoneCalc = calculateStones((s.stones ?? []).map((x) => ({ ...x, deductFromGross: true })));
    const net = calculateNetWeight(s.gross, stoneCalc.totalDeductGram, s.other ?? 0);
    const touchRow = purityDefs.find((p) => p[0] === s.purity)!;
    const fine = calculateFineWeight(net, touchRow[2]);
    const p = await db.product.create({
      data: {
        itemCode: s.code, designNo: s.design, name: s.name, barcode: s.barcode, categoryId: cats[s.cat], metalId: gold.id, purityId: purities[s.purity], touch: touchRow[2],
        pieces: s.pieces, grossWeight: s.gross, stoneWeight: stoneCalc.totalWeightGram.toString(), otherWeight: s.other ?? 0, netWeight: net.toString(), fineWeight: fine.toString(),
        supplierId: s.supplier, purchaseCost: s.cost, purchaseRate: 7600, makingType: "PER_GRAM", makingCharge: 450, locationId: main.id, purchaseDate: new Date(d0),
        stones: { create: (s.stones ?? []).map((x, i) => ({ ...x, weightGram: stoneCalc.results[i].weightGram.toString(), amount: stoneCalc.results[i].amount.toString() })) },
      },
    });
    products[s.code] = p.id;
    await db.stockMovement.create({ data: { productId: p.id, txnType: "OPENING_STOCK", piecesIn: s.pieces, grossIn: s.gross, netIn: net.toString(), fineIn: fine.toString(), locationId: main.id, reference: "Opening" } });
  }

  // Demo transactions
  const actor = { id: owner.id, name: owner.name };
  const pd = async (code: string) => db.product.findUniqueOrThrow({ where: { id: products[code] } });
  const asItem = async (code: string, rate: number, making: number, extra: Record<string, unknown> = {}) => {
    const p = await pd(code);
    return { productId: p.id, description: p.name ?? p.designNo, designNo: p.designNo, hsn: "7113", pieces: p.pieces, grossWeight: p.grossWeight.toString(), stoneWeight: p.stoneWeight.toString(), otherWeight: p.otherWeight.toString(), touch: p.touch.toString(), goldRate: rate, makingType: "PER_GRAM" as const, makingRate: making, stoneAmount: 0, ...extra };
  };
  const stoneAmt = async (code: string) => (await db.productStone.findMany({ where: { productId: products[code] } })).reduce((a, s) => a + Number(s.amount), 0);

  await postSale({ customerId: raj.id, date: d0, billingMode: "METAL", gstRate: 3, items: [await asItem("T0003", 7850, 450), await asItem("T0004", 7850, 450)] }, actor);
  await postSale({ customerId: shree.id, date: d0, billingMode: "MONEY", gstRate: 3, items: [await asItem("T0001", 6420, 900, { stoneAmount: await stoneAmt("T0001") }), await asItem("T0006", 7850, 520)] }, actor);
  await postSale({ customerId: maha.id, date: d0, billingMode: "METAL", gstRate: 3, items: [await asItem("T0007", 7850, 400)] }, actor);

  await postCashReceipt({ customerId: shree.id, date: d0, amount: 100000, paymentMode: "UPI", referenceNo: "UPI-88213", remarks: "Part payment" }, actor);
  await postGoldReceipt({ customerId: raj.id, date: d0, physicalWeight: 10, touch: 92, remarks: "Old gold received" }, actor);
  await postRateFixing({ customerId: raj.id, date: d0, fineWeight: 20, rate: 7850, reference: "Phone confirm" }, actor);

  console.log(`Done. Login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
