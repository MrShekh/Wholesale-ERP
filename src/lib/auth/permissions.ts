/**
 * Permission catalogue. Roles are bundles of these keys; users may have extra grants / denials
 * on top (custom combinations).
 */
export const PERMISSIONS = {
  "dashboard.view": "View dashboard",
  "cost.view": "View purchase cost",
  "profit.view": "View profit",
  "sale.view": "View sales",
  "sale.create": "Create sale",
  "sale.edit": "Edit sale",
  "sale.cancel": "Cancel sale",
  "sale.override_pricing": "Override customer pricing on invoice",
  "weight.override_net": "Override net weight",
  "purchase.view": "View purchases",
  "purchase.create": "Create purchase",
  "purchase.edit": "Edit purchase",
  "inventory.view": "View inventory",
  "inventory.manage": "Manage products & stock",
  "stock.adjust": "Stock adjustment",
  "customer.view": "View customers",
  "customer.manage": "Create / edit customers",
  "customer.payment": "Customer payment",
  "gold.receipt": "Gold receipt",
  "rate.fix": "Rate fixing",
  "supplier.manage": "Manage suppliers",
  "reports.view": "Reports",
  "settings.manage": "Settings",
  "users.manage": "User management",
  "audit.view": "View audit log",
} as const;

export type Permission = keyof typeof PERMISSIONS;
const ALL = Object.keys(PERMISSIONS) as Permission[];

export const SYSTEM_ROLES: Record<string, { description: string; permissions: Permission[] }> = {
  Owner: { description: "Full access", permissions: ALL },
  Admin: { description: "Everything except owner-only data", permissions: ALL.filter((p) => p !== "profit.view") },
  Accountant: {
    description: "Ledgers, payments, reports",
    permissions: ["dashboard.view", "cost.view", "profit.view", "sale.view", "purchase.view", "inventory.view", "customer.view", "customer.payment", "gold.receipt", "rate.fix", "reports.view", "audit.view"],
  },
  Salesperson: {
    description: "Create sales, view stock & customers",
    permissions: ["dashboard.view", "sale.view", "sale.create", "inventory.view", "customer.view"],
  },
  "Inventory Manager": {
    description: "Stock, products, purchases",
    permissions: ["dashboard.view", "inventory.view", "inventory.manage", "stock.adjust", "purchase.view", "purchase.create", "supplier.manage"],
  },
};

export function resolvePermissions(role: string[] | undefined, extra: string[] = [], denied: string[] = []): Set<string> {
  const set = new Set<string>([...(role ?? []), ...extra]);
  denied.forEach((d) => set.delete(d));
  return set;
}
