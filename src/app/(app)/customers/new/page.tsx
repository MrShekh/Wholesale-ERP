import { PageHeader } from "@/components/page";
import { requirePermission } from "@/lib/auth/session";
import { CustomerForm } from "@/modules/customers/components/customer-form";

export const metadata = { title: "Add Customer" };

export default async function NewCustomerPage() {
  await requirePermission("customer.manage");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Add Customer" subtitle="Only the business name is required. You can fill the rest later." />
      <CustomerForm />
    </div>
  );
}
