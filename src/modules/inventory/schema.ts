import { z } from "zod";

const num = z.union([z.string(), z.number()]).transform((v) => String(v === "" ? "0" : v));

export const productSchema = z.object({
  itemCode: z.string().trim().min(1, "Item Code / Tag number is required"),
  designNo: z.string().trim().min(1, "Design Number is required"),
  name: z.string().trim().optional(),
  categoryId: z.string().min(1, "Select category"),
  purityId: z.string().min(1, "Select purity"),
  pieces: z.coerce.number().int().min(1).default(1),
  grossWeight: num,
  stoneWeight: num.default("0"),
  otherWeight: num.default("0"),
  netWeightOverride: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v === "" || v === undefined || v === null ? undefined : String(v))),
  barcode: z.string().trim().optional(),
  huid: z.string().trim().optional(),
  supplierId: z.string().optional().nullable(),
  purchaseCost: num.default("0"),
  makingType: z.enum(["PER_GRAM", "PER_PIECE", "PERCENT", "FIXED", "CUSTOM"]).default("PER_GRAM"),
  makingCharge: num.default("0"),
  locationId: z.string().optional().nullable(),
  notes: z.string().trim().optional(),
});

export type ProductFormInput = z.input<typeof productSchema>;
