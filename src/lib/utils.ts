import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { D, type Numeric } from "@/lib/calculations/decimal";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Indian digit grouping (12,34,567.89) done on the decimal string — no float conversion. */
function groupIndian(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

export function formatMoney(v: Numeric | null | undefined, opts: { symbol?: boolean; dp?: number } = {}): string {
  const { symbol = true, dp = 2 } = opts;
  const d = D(v).toDecimalPlaces(dp);
  const neg = d.isNegative();
  const [i, f] = d.abs().toFixed(dp).split(".");
  return `${neg ? "-" : ""}${symbol ? "₹" : ""}${groupIndian(i)}${f ? "." + f : ""}`;
}

/** Money without paise for big headline numbers */
export const formatMoneyShort = (v: Numeric | null | undefined) => formatMoney(v, { dp: 0 });

export function formatWeight(v: Numeric | null | undefined, dp = 3, unit = true): string {
  const d = D(v).toDecimalPlaces(dp);
  const [i, f] = d.toFixed(dp).split(".");
  const neg = i.startsWith("-");
  const num = `${neg ? "-" : ""}${groupIndian(neg ? i.slice(1) : i)}${f ? "." + f : ""}`;
  return unit ? `${num} g` : num;
}

export const formatFine = (v: Numeric | null | undefined, unit = true) => formatWeight(v, 4, unit);

/** "45.250 g Dr" style for ledgers (receivable view). */
export function formatBalance(v: Numeric | null | undefined, kind: "money" | "weight" | "fine"): string {
  const d = D(v);
  const abs = d.abs();
  const label = kind === "money" ? formatMoney(abs) : kind === "fine" ? formatFine(abs) : formatWeight(abs);
  return d.isZero() ? label : `${label} ${d.isPositive() ? "Dr" : "Cr"}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
