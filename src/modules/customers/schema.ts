import { z } from "zod";

const money = z.coerce.number().min(0, "Cannot be negative").default(0);
const signed = z.coerce.number().default(0);
const opt = z.string().trim().optional().or(z.literal("")).transform((v) => v || undefined);

export const customerSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business name"),
  contactPerson: opt,
  phone: z.string().trim().regex(/^[0-9+\-\s]{8,15}$/, "Enter a valid phone number").optional().or(z.literal("")).transform((v) => v || undefined),
  whatsapp: opt,
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")).transform((v) => v || undefined),
  gstin: z.string().trim().toUpperCase().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "GSTIN format looks wrong").optional().or(z.literal("")).transform((v) => v || undefined),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "PAN format looks wrong").optional().or(z.literal("")).transform((v) => v || undefined),
  billingAddress: opt,
  shippingAddress: opt,
  city: opt,
  state: opt,
  stateCode: z.string().trim().regex(/^\d{2}$/, "2-digit state code").optional().or(z.literal("")).transform((v) => v || undefined),
  creditLimit: money,
  creditDays: z.coerce.number().int().min(0).default(0),
  defaultBillingMode: z.enum(["MONEY", "METAL"]).default("MONEY"),
  defaultMakingType: z.enum(["PER_GRAM", "PER_PIECE", "PERCENT", "FIXED", "CUSTOM"]).default("PER_GRAM"),
  defaultMakingRate: money,
  defaultGoldMargin: money,
  defaultWastagePct: money,
  defaultDiscountPct: money,
  defaultStoneRate: money,
  defaultDiamondRate: money,
  openingCash: signed,
  openingFine: signed,
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE"),
  notes: opt,
});

export type CustomerFormInput = z.input<typeof customerSchema>;
