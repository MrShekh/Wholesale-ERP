import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  console.log("Clearing all transactional data, customers, products and ledgers...");

  // Delete child records first in dependency order
  await db.saleItemStone.deleteMany();
  await db.saleItem.deleteMany();
  await db.taxEntry.deleteMany();
  await db.salesReturnItem.deleteMany();
  await db.salesReturn.deleteMany();
  await db.approvalItem.deleteMany();
  await db.approvalMemo.deleteMany();
  await db.sale.deleteMany();

  await db.purchaseItem.deleteMany();
  await db.purchase.deleteMany();

  await db.stockMovement.deleteMany();
  await db.stockAdjustment.deleteMany();
  await db.stockTransferItem.deleteMany();
  await db.stockTransfer.deleteMany();
  await db.productStone.deleteMany();
  await db.product.deleteMany();
  await db.lot.deleteMany();

  await db.goldReceipt.deleteMany();
  await db.cashReceipt.deleteMany();
  await db.rateFixing.deleteMany();
  await db.customerMetalLedger.deleteMany();
  await db.customerMoneyLedger.deleteMany();
  await db.supplierMetalLedger.deleteMany();
  await db.supplierMoneyLedger.deleteMany();

  await db.customer.deleteMany();
  await db.supplier.deleteMany();
  await db.auditLog.deleteMany();
  await db.numberSequence.deleteMany();

  console.log("Database cleared successfully! All master data, purities, business settings, and login accounts are preserved.");
}

main()
  .catch((e) => {
    console.error("Failed to clean database:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
