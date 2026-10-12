-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CANCELLED', 'VOID');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('MONEY', 'METAL');

-- CreateEnum
CREATE TYPE "MakingType" AS ENUM ('PER_GRAM', 'PER_PIECE', 'PERCENT', 'FIXED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StoneUnit" AS ENUM ('CARAT', 'GRAM', 'PIECE', 'CENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StoneRateMethod" AS ENUM ('PER_CARAT', 'PER_GRAM', 'PER_PIECE', 'FIXED', 'INCLUDED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'SOLD', 'ON_APPROVAL', 'RESERVED', 'IN_TRANSIT', 'RETURNED', 'DAMAGED', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MetalTxnType" AS ENUM ('OPENING', 'SALE', 'SALE_RETURN', 'GOLD_RECEIPT', 'RATE_FIXING', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE', 'PURCHASE_RETURN', 'GOLD_PAYMENT', 'EXCHANGE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "MoneyTxnType" AS ENUM ('OPENING', 'SALE', 'SALE_RETURN', 'CASH_RECEIPT', 'BANK_RECEIPT', 'RATE_FIXING', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE', 'PURCHASE_RETURN', 'SUPPLIER_PAYMENT', 'EXCHANGE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "StockTxnType" AS ENUM ('OPENING_STOCK', 'PURCHASE_IN', 'SALE_OUT', 'SALE_RETURN_IN', 'PURCHASE_RETURN_OUT', 'APPROVAL_OUT', 'APPROVAL_RETURN', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'CHEQUE', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('OPEN', 'PARTIAL', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdjustmentReason" AS ENUM ('WEIGHT_DIFFERENCE', 'DAMAGED', 'MISSING', 'MANUAL_CORRECTION', 'OPENING_ADJUSTMENT', 'MELTING', 'RECLASSIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('SALE', 'PURCHASE', 'GOLD_RECEIPT', 'CASH_RECEIPT', 'APPROVAL', 'SALE_RETURN', 'PURCHASE_RETURN', 'RATE_FIXING', 'SUPPLIER_PAYMENT', 'ADJUSTMENT', 'TRANSFER', 'EXCHANGE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT,
    "extraPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deniedPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "recordRef" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "ip" TEXT,
    "device" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "logoUrl" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "stateCode" TEXT NOT NULL DEFAULT '27',
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "upi" TEXT,
    "terms" TEXT,
    "signatureUrl" TEXT,
    "weightDecimals" INTEGER NOT NULL DEFAULT 3,
    "gramsPerCarat" DECIMAL(10,6) NOT NULL DEFAULT 0.2,
    "caratsPerCent" DECIMAL(10,6) NOT NULL DEFAULT 0.01,
    "roundOffInvoice" BOOLEAN NOT NULL DEFAULT false,
    "taxMetalValueInMetalMode" BOOLEAN NOT NULL DEFAULT false,
    "stoneDeductsFromGross" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FinancialYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "docType" "DocType" NOT NULL,
    "fyLabel" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "padding" INTEGER NOT NULL DEFAULT 4,
    "nextNo" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GstRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hsn" TEXT NOT NULL,
    "rate" DECIMAL(6,3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GstRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Metal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purity" (
    "id" TEXT NOT NULL,
    "metalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "karat" DECIMAL(5,2),
    "touch" DECIMAL(7,3) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Purity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalRate" (
    "id" TEXT NOT NULL,
    "metalId" TEXT NOT NULL,
    "purityId" TEXT,
    "date" DATE NOT NULL,
    "ratePerGram" DECIMAL(16,4) NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoneType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPrecious" BOOLEAN NOT NULL DEFAULT false,
    "defaultUnit" "StoneUnit" NOT NULL DEFAULT 'CARAT',
    "defaultMethod" "StoneRateMethod" NOT NULL DEFAULT 'PER_CARAT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StoneType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OFFICE',
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PriceGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "creditLimit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "creditDays" INTEGER NOT NULL DEFAULT 0,
    "defaultBillingMode" "BillingMode" NOT NULL DEFAULT 'MONEY',
    "priceGroupId" TEXT,
    "defaultMakingType" "MakingType" NOT NULL DEFAULT 'PER_GRAM',
    "defaultMakingRate" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "defaultGoldMargin" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "defaultWastagePct" DECIMAL(7,3) NOT NULL DEFAULT 0,
    "defaultDiscountPct" DECIMAL(7,3) NOT NULL DEFAULT 0,
    "defaultStoneRate" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "defaultDiamondRate" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "defaultStonePricing" "StoneRateMethod" NOT NULL DEFAULT 'PER_CARAT',
    "openingCash" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "openingFine" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "stateCode" TEXT,
    "defaultPurityId" TEXT,
    "paymentTerms" TEXT,
    "openingFine" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "openingMoney" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "status" "PartyStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT,
    "purityId" TEXT,
    "supplierId" TEXT,
    "locationId" TEXT,
    "pieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "stoneWeight" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "remainingPieces" INTEGER NOT NULL,
    "remainingGross" DECIMAL(14,3) NOT NULL,
    "remainingNet" DECIMAL(14,3) NOT NULL,
    "remainingFine" DECIMAL(14,4) NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "designNo" TEXT NOT NULL,
    "barcode" TEXT,
    "qrCode" TEXT,
    "name" TEXT,
    "categoryId" TEXT,
    "subcategory" TEXT,
    "collectionId" TEXT,
    "metalId" TEXT NOT NULL,
    "purityId" TEXT NOT NULL,
    "touch" DECIMAL(7,3) NOT NULL,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "stoneWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "otherWeight" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "netWeightOverridden" BOOLEAN NOT NULL DEFAULT false,
    "huid" TEXT,
    "supplierId" TEXT,
    "purchaseRate" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "purchaseMaking" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "purchaseStoneCost" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "purchaseCost" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "makingType" "MakingType" NOT NULL DEFAULT 'PER_GRAM',
    "makingCharge" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "locationId" TEXT,
    "lotId" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "imageUrl" TEXT,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "purchaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStone" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stoneTypeId" TEXT,
    "stoneName" TEXT NOT NULL,
    "shape" TEXT,
    "size" TEXT,
    "color" TEXT,
    "quality" TEXT,
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "weight" DECIMAL(14,4) NOT NULL,
    "unit" "StoneUnit" NOT NULL DEFAULT 'CARAT',
    "weightGram" DECIMAL(14,4) NOT NULL,
    "method" "StoneRateMethod" NOT NULL DEFAULT 'PER_CARAT',
    "rate" DECIMAL(16,4) NOT NULL DEFAULT 0,
    "amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deductFromGross" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductStone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "txnType" "StockTxnType" NOT NULL,
    "docType" "DocType",
    "docId" TEXT,
    "reference" TEXT,
    "piecesIn" INTEGER NOT NULL DEFAULT 0,
    "piecesOut" INTEGER NOT NULL DEFAULT 0,
    "grossIn" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "grossOut" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "netIn" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "netOut" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "fineIn" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "fineOut" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "locationId" TEXT,
    "reversesId" TEXT,
    "userId" TEXT,
    "notes" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "reason" "AdjustmentReason" NOT NULL,
    "beforePieces" INTEGER NOT NULL,
    "afterPieces" INTEGER NOT NULL,
    "beforeGross" DECIMAL(14,3) NOT NULL,
    "afterGross" DECIMAL(14,3) NOT NULL,
    "beforeNet" DECIMAL(14,3) NOT NULL,
    "afterNet" DECIMAL(14,3) NOT NULL,
    "beforeFine" DECIMAL(14,4) NOT NULL,
    "afterFine" DECIMAL(14,4) NOT NULL,
    "diffFine" DECIMAL(14,4) NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "notes" TEXT,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "senderId" TEXT,
    "receiverId" TEXT,
    "notes" TEXT,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "StockTransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dueDate" DATE,
    "customerId" TEXT NOT NULL,
    "billingMode" "BillingMode" NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "placeOfSupplyState" TEXT,
    "placeOfSupplyCode" TEXT,
    "isInterState" BOOLEAN NOT NULL DEFAULT false,
    "gstRate" DECIMAL(6,3) NOT NULL DEFAULT 3,
    "hsn" TEXT,
    "totalPieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "stoneWeight" DECIMAL(14,4) NOT NULL,
    "otherWeight" DECIMAL(14,3) NOT NULL,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "goldValue" DECIMAL(16,2) NOT NULL,
    "billedGoldValue" DECIMAL(16,2) NOT NULL,
    "makingAmount" DECIMAL(16,2) NOT NULL,
    "stoneAmount" DECIMAL(16,2) NOT NULL,
    "otherCharges" DECIMAL(16,2) NOT NULL,
    "discount" DECIMAL(16,2) NOT NULL,
    "taxableAmount" DECIMAL(16,2) NOT NULL,
    "cgst" DECIMAL(16,2) NOT NULL,
    "sgst" DECIMAL(16,2) NOT NULL,
    "igst" DECIMAL(16,2) NOT NULL,
    "gstAmount" DECIMAL(16,2) NOT NULL,
    "roundOff" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(16,2) NOT NULL,
    "metalLedgerImpact" DECIMAL(14,4) NOT NULL,
    "moneyLedgerImpact" DECIMAL(16,2) NOT NULL,
    "costTotal" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "profitGold" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "profitMaking" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "profitStone" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "terms" TEXT,
    "approvalId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "productId" TEXT,
    "lotId" TEXT,
    "description" TEXT NOT NULL,
    "designNo" TEXT,
    "hsn" TEXT,
    "pieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "stoneWeight" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "otherWeight" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "netOverridden" BOOLEAN NOT NULL DEFAULT false,
    "touch" DECIMAL(7,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "goldRate" DECIMAL(16,4) NOT NULL,
    "goldValue" DECIMAL(16,2) NOT NULL,
    "makingType" "MakingType" NOT NULL,
    "makingRate" DECIMAL(16,4) NOT NULL,
    "makingAmount" DECIMAL(16,2) NOT NULL,
    "stoneAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "otherCharges" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(16,2) NOT NULL,
    "gstAmount" DECIMAL(16,2) NOT NULL,
    "lineTotal" DECIMAL(16,2) NOT NULL,
    "costAmount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "returnedPieces" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItemStone" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "stoneName" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "weight" DECIMAL(14,4) NOT NULL,
    "unit" "StoneUnit" NOT NULL,
    "weightGram" DECIMAL(14,4) NOT NULL,
    "method" "StoneRateMethod" NOT NULL,
    "rate" DECIMAL(16,4) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "SaleItemStone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxEntry" (
    "id" TEXT NOT NULL,
    "docType" "DocType" NOT NULL,
    "docId" TEXT NOT NULL,
    "saleId" TEXT,
    "date" DATE NOT NULL,
    "hsn" TEXT,
    "partyGstin" TEXT,
    "taxable" DECIMAL(16,2) NOT NULL,
    "cgstRate" DECIMAL(6,3) NOT NULL,
    "sgstRate" DECIMAL(6,3) NOT NULL,
    "igstRate" DECIMAL(6,3) NOT NULL,
    "cgst" DECIMAL(16,2) NOT NULL,
    "sgst" DECIMAL(16,2) NOT NULL,
    "igst" DECIMAL(16,2) NOT NULL,
    "total" DECIMAL(16,2) NOT NULL,
    "reversesId" TEXT,

    CONSTRAINT "TaxEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMetalLedger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txnType" "MetalTxnType" NOT NULL,
    "docType" "DocType",
    "docId" TEXT,
    "reference" TEXT,
    "debitFine" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "creditFine" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "physicalWeight" DECIMAL(14,3),
    "touch" DECIMAL(7,3),
    "remarks" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "reversesId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerMetalLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMoneyLedger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txnType" "MoneyTxnType" NOT NULL,
    "docType" "DocType",
    "docId" TEXT,
    "reference" TEXT,
    "debit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode",
    "remarks" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "reversesId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerMoneyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierMetalLedger" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txnType" "MetalTxnType" NOT NULL,
    "docType" "DocType",
    "docId" TEXT,
    "reference" TEXT,
    "debitFine" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "creditFine" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "reversesId" TEXT,
    "userId" TEXT,

    CONSTRAINT "SupplierMetalLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierMoneyLedger" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txnType" "MoneyTxnType" NOT NULL,
    "docType" "DocType",
    "docId" TEXT,
    "reference" TEXT,
    "debit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode",
    "remarks" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "reversesId" TEXT,
    "userId" TEXT,

    CONSTRAINT "SupplierMoneyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldReceipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "physicalWeight" DECIMAL(14,3) NOT NULL,
    "touch" DECIMAL(7,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "reference" TEXT,
    "remarks" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "GoldReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashReceipt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "referenceNo" TEXT,
    "bank" TEXT,
    "remarks" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "CashReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateFixing" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "rate" DECIMAL(16,4) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "RateFixing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalMemo" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "expectedReturn" DATE,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'OPEN',
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalItem" (
    "id" TEXT NOT NULL,
    "memoId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "returnedPieces" INTEGER NOT NULL DEFAULT 0,
    "soldPieces" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApprovalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "taxable" DECIMAL(16,2) NOT NULL,
    "gstAmount" DECIMAL(16,2) NOT NULL,
    "total" DECIMAL(16,2) NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "saleItemId" TEXT,
    "productId" TEXT,
    "pieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "taxable" DECIMAL(16,2) NOT NULL,
    "gstAmount" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierInvoiceNo" TEXT,
    "date" DATE NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalPieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "stoneWeight" DECIMAL(14,4) NOT NULL,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "goldValue" DECIMAL(16,2) NOT NULL,
    "makingAmount" DECIMAL(16,2) NOT NULL,
    "stoneAmount" DECIMAL(16,2) NOT NULL,
    "otherCharges" DECIMAL(16,2) NOT NULL,
    "taxableAmount" DECIMAL(16,2) NOT NULL,
    "gstAmount" DECIMAL(16,2) NOT NULL,
    "grandTotal" DECIMAL(16,2) NOT NULL,
    "billingMode" "BillingMode" NOT NULL DEFAULT 'MONEY',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT,
    "designNo" TEXT,
    "description" TEXT NOT NULL,
    "pieces" INTEGER NOT NULL,
    "grossWeight" DECIMAL(14,3) NOT NULL,
    "stoneWeight" DECIMAL(14,4) NOT NULL,
    "otherWeight" DECIMAL(14,3) NOT NULL,
    "netWeight" DECIMAL(14,3) NOT NULL,
    "touch" DECIMAL(7,3) NOT NULL,
    "fineWeight" DECIMAL(14,4) NOT NULL,
    "rate" DECIMAL(16,4) NOT NULL,
    "goldValue" DECIMAL(16,2) NOT NULL,
    "makingAmount" DECIMAL(16,2) NOT NULL,
    "stoneCost" DECIMAL(16,2) NOT NULL,
    "otherCost" DECIMAL(16,2) NOT NULL,
    "gstAmount" DECIMAL(16,2) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orientation" TEXT NOT NULL DEFAULT 'PORTRAIT',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "okRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errors" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "AuditLog_module_at_idx" ON "AuditLog"("module", "at");

-- CreateIndex
CREATE INDEX "AuditLog_recordType_recordId_idx" ON "AuditLog"("recordType", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_at_idx" ON "AuditLog"("userId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_label_key" ON "FinancialYear"("label");

-- CreateIndex
CREATE UNIQUE INDEX "NumberSequence_docType_fyLabel_key" ON "NumberSequence"("docType", "fyLabel");

-- CreateIndex
CREATE UNIQUE INDEX "Metal_name_key" ON "Metal"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Purity_metalId_name_key" ON "Purity"("metalId", "name");

-- CreateIndex
CREATE INDEX "MetalRate_metalId_purityId_date_idx" ON "MetalRate"("metalId", "purityId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_name_key" ON "Collection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StoneType_name_key" ON "StoneType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PriceGroup_name_key" ON "PriceGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_businessName_idx" ON "Customer"("businessName");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_gstin_idx" ON "Customer"("gstin");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_companyName_idx" ON "Supplier"("companyName");

-- CreateIndex
CREATE INDEX "Supplier_phone_idx" ON "Supplier"("phone");

-- CreateIndex
CREATE INDEX "Supplier_gstin_idx" ON "Supplier"("gstin");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotNumber_key" ON "Lot"("lotNumber");

-- CreateIndex
CREATE INDEX "Lot_status_idx" ON "Lot"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Product_itemCode_key" ON "Product"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Product_huid_key" ON "Product"("huid");

-- CreateIndex
CREATE INDEX "Product_designNo_idx" ON "Product"("designNo");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_purityId_idx" ON "Product"("purityId");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- CreateIndex
CREATE INDEX "Product_lotId_idx" ON "Product"("lotId");

-- CreateIndex
CREATE INDEX "Product_locationId_idx" ON "Product"("locationId");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_grossWeight_idx" ON "Product"("grossWeight");

-- CreateIndex
CREATE INDEX "ProductStone_productId_idx" ON "ProductStone"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_date_idx" ON "StockMovement"("productId", "date");

-- CreateIndex
CREATE INDEX "StockMovement_docType_docId_idx" ON "StockMovement"("docType", "docId");

-- CreateIndex
CREATE INDEX "StockMovement_txnType_idx" ON "StockMovement"("txnType");

-- CreateIndex
CREATE INDEX "StockMovement_date_idx" ON "StockMovement"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StockAdjustment_number_key" ON "StockAdjustment"("number");

-- CreateIndex
CREATE INDEX "StockAdjustment_productId_idx" ON "StockAdjustment"("productId");

-- CreateIndex
CREATE INDEX "StockAdjustment_date_idx" ON "StockAdjustment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_number_key" ON "StockTransfer"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_number_key" ON "Sale"("number");

-- CreateIndex
CREATE INDEX "Sale_customerId_date_idx" ON "Sale"("customerId", "date");

-- CreateIndex
CREATE INDEX "Sale_date_idx" ON "Sale"("date");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");

-- CreateIndex
CREATE INDEX "TaxEntry_docType_docId_idx" ON "TaxEntry"("docType", "docId");

-- CreateIndex
CREATE INDEX "TaxEntry_date_idx" ON "TaxEntry"("date");

-- CreateIndex
CREATE INDEX "CustomerMetalLedger_customerId_date_idx" ON "CustomerMetalLedger"("customerId", "date");

-- CreateIndex
CREATE INDEX "CustomerMetalLedger_docType_docId_idx" ON "CustomerMetalLedger"("docType", "docId");

-- CreateIndex
CREATE INDEX "CustomerMoneyLedger_customerId_date_idx" ON "CustomerMoneyLedger"("customerId", "date");

-- CreateIndex
CREATE INDEX "CustomerMoneyLedger_docType_docId_idx" ON "CustomerMoneyLedger"("docType", "docId");

-- CreateIndex
CREATE INDEX "SupplierMetalLedger_supplierId_date_idx" ON "SupplierMetalLedger"("supplierId", "date");

-- CreateIndex
CREATE INDEX "SupplierMoneyLedger_supplierId_date_idx" ON "SupplierMoneyLedger"("supplierId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GoldReceipt_number_key" ON "GoldReceipt"("number");

-- CreateIndex
CREATE INDEX "GoldReceipt_customerId_date_idx" ON "GoldReceipt"("customerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CashReceipt_number_key" ON "CashReceipt"("number");

-- CreateIndex
CREATE INDEX "CashReceipt_customerId_date_idx" ON "CashReceipt"("customerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RateFixing_number_key" ON "RateFixing"("number");

-- CreateIndex
CREATE INDEX "RateFixing_customerId_date_idx" ON "RateFixing"("customerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalMemo_number_key" ON "ApprovalMemo"("number");

-- CreateIndex
CREATE INDEX "ApprovalMemo_customerId_idx" ON "ApprovalMemo"("customerId");

-- CreateIndex
CREATE INDEX "ApprovalMemo_status_idx" ON "ApprovalMemo"("status");

-- CreateIndex
CREATE INDEX "ApprovalItem_memoId_idx" ON "ApprovalItem"("memoId");

-- CreateIndex
CREATE INDEX "ApprovalItem_productId_idx" ON "ApprovalItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturn_number_key" ON "SalesReturn"("number");

-- CreateIndex
CREATE INDEX "SalesReturn_customerId_date_idx" ON "SalesReturn"("customerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_number_key" ON "Purchase"("number");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_date_idx" ON "Purchase"("supplierId", "date");

-- CreateIndex
CREATE INDEX "SavedView_userId_table_idx" ON "SavedView"("userId", "table");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purity" ADD CONSTRAINT "Purity_metalId_fkey" FOREIGN KEY ("metalId") REFERENCES "Metal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetalRate" ADD CONSTRAINT "MetalRate_metalId_fkey" FOREIGN KEY ("metalId") REFERENCES "Metal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetalRate" ADD CONSTRAINT "MetalRate_purityId_fkey" FOREIGN KEY ("purityId") REFERENCES "Purity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_priceGroupId_fkey" FOREIGN KEY ("priceGroupId") REFERENCES "PriceGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_metalId_fkey" FOREIGN KEY ("metalId") REFERENCES "Metal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_purityId_fkey" FOREIGN KEY ("purityId") REFERENCES "Purity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStone" ADD CONSTRAINT "ProductStone_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "ApprovalMemo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItemStone" ADD CONSTRAINT "SaleItemStone_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxEntry" ADD CONSTRAINT "TaxEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMetalLedger" ADD CONSTRAINT "CustomerMetalLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMoneyLedger" ADD CONSTRAINT "CustomerMoneyLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierMetalLedger" ADD CONSTRAINT "SupplierMetalLedger_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierMoneyLedger" ADD CONSTRAINT "SupplierMoneyLedger_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldReceipt" ADD CONSTRAINT "GoldReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReceipt" ADD CONSTRAINT "CashReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateFixing" ADD CONSTRAINT "RateFixing_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalMemo" ADD CONSTRAINT "ApprovalMemo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES "ApprovalMemo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
