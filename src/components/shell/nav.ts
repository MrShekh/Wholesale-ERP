import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package, Users, Truck, BarChart3, Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem { label: string; href: string; soon?: boolean }
export interface NavGroup { label: string; icon: LucideIcon; href?: string; items?: NavItem[] }

export const NAV: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  {
    label: "Sales", icon: ShoppingBag, items: [
      { label: "New Sale", href: "/sales/new" },
      { label: "Sales Registry", href: "/sales" },
      { label: "Sales Returns", href: "/sales/returns", soon: true },
      { label: "Approval / Memo", href: "/sales/approvals", soon: true },
    ],
  },
  {
    label: "Purchases", icon: ShoppingCart, items: [
      { label: "New Purchase", href: "/purchases/new", soon: true },
      { label: "Purchase Registry", href: "/purchases", soon: true },
      { label: "Purchase Return", href: "/purchases/returns", soon: true },
    ],
  },
  {
    label: "Inventory", icon: Package, items: [
      { label: "Jewellery Stock", href: "/inventory" },
      { label: "Add Stock Item", href: "/inventory/new" },
      { label: "Lots", href: "/inventory/lots", soon: true },
      { label: "Products / Designs", href: "/inventory/products", soon: true },
      { label: "Stones / Diamonds", href: "/inventory/stones", soon: true },
      { label: "Stock Adjustments", href: "/inventory/adjustments", soon: true },
      { label: "Stock Transfer", href: "/inventory/transfers", soon: true },
    ],
  },
  {
    label: "Customers", icon: Users, items: [
      { label: "Customer List", href: "/customers" },
      { label: "Gold Receipts", href: "/customers/gold-receipts", soon: true },
      { label: "Cash Receipts", href: "/customers/cash-receipts", soon: true },
      { label: "Rate Fixing", href: "/customers/rate-fixing", soon: true },
    ],
  },
  {
    label: "Suppliers", icon: Truck, items: [
      { label: "Supplier List", href: "/suppliers", soon: true },
      { label: "Supplier Payments", href: "/suppliers/payments", soon: true },
    ],
  },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];
