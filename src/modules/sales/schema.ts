import { z } from "zod";

const num = z.union([z.string(), z.number()]).transform((v) => String(v === "" ? "0" : v));

export const saleStoneSchema = z.object({
  stoneName: z.string().min(1),
  pieces: z.coerce.number().int().min(0).default(1),
  weight: num,
  unit: z.enum(["CARAT", "GRAM", "PIECE", "CENT", "CUSTOM"]),
  method: z.enum(["PER_CARAT", "PER_GRAM", "PER_PIECE", "FIXED", "INCLUDED"]),
  rate: num,
  fixedAmount: num.optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1, "Enter item name"),
  designNo: z.string().optional().nullable(),
  hsn: z.string().optional().nullable(),
  pieces: z.coerce.number().int().min(1, "Pieces must be at least 1"),
  grossWeight: num,
  stoneWeight: num.default("0"),
  otherWeight: num.default("0"),
  netWeightOverride: num.optional().nullable(),
  touch: num,
  goldRate: num,
  makingType: z.enum(["PER_GRAM", "PER_PIECE", "PERCENT", "FIXED", "CUSTOM"]),
  makingRate: num,
  makingAmount: num.optional(),
  stoneAmount: num.default("0"),
  otherCharges: num.default("0"),
  discount: num.default("0"),
  stones: z.array(saleStoneSchema).optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  date: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  billingMode: z.enum(["MONEY", "METAL"]),
  gstRate: num.default("3"),
  placeOfSupplyCode: z.string().optional().nullable(),
  placeOfSupplyState: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  approvalId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Add at least one item"),
});

export type CreateSaleInput = z.input<typeof createSaleSchema>;
export type CreateSaleParsed = z.output<typeof createSaleSchema>;
