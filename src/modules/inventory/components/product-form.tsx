"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createProduct } from "../actions";
import type { ProductFormInput } from "../schema";
import { calculateFineWeight, calculateNetWeight } from "@/lib/calculations/weight";
import { formatFine, formatWeight } from "@/lib/utils";

interface PurityOption {
  id: string;
  name: string;
  touch: string;
}

interface Option {
  id: string;
  name: string;
}

export function ProductForm({
  categories,
  purities,
  suppliers,
  locations,
  suggestedCode,
}: {
  categories: Option[];
  purities: PurityOption[];
  suppliers: Option[];
  locations: Option[];
  suggestedCode: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<ProductFormInput>({
    defaultValues: {
      itemCode: suggestedCode,
      designNo: "",
      name: "",
      categoryId: categories[0]?.id ?? "",
      purityId: purities[0]?.id ?? "",
      pieces: 1,
      grossWeight: "",
      stoneWeight: "0",
      otherWeight: "0",
      netWeightOverride: "",
      barcode: suggestedCode,
      huid: "",
      supplierId: "",
      purchaseCost: "0",
      makingType: "PER_GRAM",
      makingCharge: "450",
      locationId: locations[0]?.id ?? "",
      notes: "",
    },
  });

  const gross = form.watch("grossWeight");
  const stone = form.watch("stoneWeight");
  const other = form.watch("otherWeight");
  const purityId = form.watch("purityId");
  const netOverride = form.watch("netWeightOverride");

  const selectedPurity = useMemo(
    () => purities.find((p) => p.id === purityId),
    [purities, purityId],
  );

  const { netWeight, fineWeight } = useMemo(() => {
    const computedNet = calculateNetWeight(gross || 0, stone || 0, other || 0);
    const net = netOverride && netOverride !== "" ? netOverride : computedNet;
    const fine = selectedPurity
      ? calculateFineWeight(net, selectedPurity.touch)
      : 0;
    return { netWeight: net, fineWeight: fine };
  }, [gross, stone, other, netOverride, selectedPurity]);

  const submit = form.handleSubmit((values) => {
    start(async () => {
      const res = await createProduct(values);
      if (!res.ok) {
        toast.error(res.error);
        if (res.fieldErrors) {
          Object.entries(res.fieldErrors).forEach(([k, msg]) => {
            form.setError(k as keyof ProductFormInput, { message: msg });
          });
        }
        return;
      }
      toast.success(`Item ${res.data.code} added to inventory`);
      router.push("/inventory");
      router.refresh();
    });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Basic Jewellery Details */}
      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold">Jewellery Identification</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="designNo">Design Number *</label>
            <input
              id="designNo"
              className="field font-medium"
              placeholder="e.g. DR-1025 / CH-2205"
              autoFocus
              {...form.register("designNo", { required: true })}
            />
            {form.formState.errors.designNo && (
              <p className="mt-1 text-xs text-danger">Design number is required</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="itemCode">Tag / Item Code *</label>
            <input
              id="itemCode"
              className="field num"
              placeholder="e.g. T0015"
              {...form.register("itemCode", { required: true })}
            />
          </div>

          <div>
            <label className="label" htmlFor="name">Item Name / Description</label>
            <input
              id="name"
              className="field"
              placeholder="e.g. 22K Designer Gold Necklace"
              {...form.register("name")}
            />
          </div>

          <div>
            <label className="label" htmlFor="categoryId">Category *</label>
            <select id="categoryId" className="field" {...form.register("categoryId")}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="purityId">Purity / Karat *</label>
            <select id="purityId" className="field font-medium" {...form.register("purityId")}>
              {purities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.touch}% Touch)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="pieces">Pieces *</label>
            <input
              id="pieces"
              type="number"
              min="1"
              className="field num"
              {...form.register("pieces")}
            />
          </div>
        </div>
      </section>

      {/* Real-time Weight & Fine Gold Calculation Engine */}
      <section className="card p-6">
        <h2 className="mb-1 text-base font-semibold">Weight & Purity Engine</h2>
        <p className="mb-4 text-xs text-muted">
          Net Weight = Gross − Stone − Other. Fine Gold = Net × Touch / 100.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="grossWeight">Gross Weight (g) *</label>
            <input
              id="grossWeight"
              type="number"
              step="any"
              inputMode="decimal"
              className="field num text-base font-semibold"
              placeholder="0.000"
              {...form.register("grossWeight", { required: true })}
            />
          </div>

          <div>
            <label className="label" htmlFor="stoneWeight">Stone Weight (g)</label>
            <input
              id="stoneWeight"
              type="number"
              step="any"
              inputMode="decimal"
              className="field num"
              placeholder="0.000"
              {...form.register("stoneWeight")}
            />
          </div>

          <div>
            <label className="label" htmlFor="otherWeight">Other / Wax / Enamel Wt (g)</label>
            <input
              id="otherWeight"
              type="number"
              step="any"
              inputMode="decimal"
              className="field num"
              placeholder="0.000"
              {...form.register("otherWeight")}
            />
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-subtle p-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-muted">Gross Wt</div>
            <div className="num mt-1 text-lg font-semibold">{formatWeight(gross || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Stone + Other</div>
            <div className="num mt-1 text-lg font-medium text-muted">
              {formatWeight(Number(stone || 0) + Number(other || 0))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Net Metal Wt</div>
            <div className="num mt-1 text-lg font-bold text-ink">
              {formatWeight(netWeight)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Calculated Fine Gold</div>
            <div className="num mt-1 text-lg font-bold text-accent">
              {formatFine(fineWeight)}
            </div>
          </div>
        </div>
      </section>

      {/* Default Wholesale Selling Rates */}
      <section className="card p-6">
        <h2 className="mb-4 text-base font-semibold">Default Making Charge (Selling Hint)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="makingType">Making Charge Type</label>
            <select id="makingType" className="field" {...form.register("makingType")}>
              <option value="PER_GRAM">Per Gram (₹/g)</option>
              <option value="PER_PIECE">Per Piece (₹/pc)</option>
              <option value="PERCENT">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="makingCharge">Default Making Rate</label>
            <input
              id="makingCharge"
              type="number"
              step="any"
              className="field num"
              placeholder="e.g. 450"
              {...form.register("makingCharge")}
            />
          </div>
        </div>
      </section>

      {/* Optional Advanced Settings */}
      <section className="card">
        <button
          type="button"
          className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>Advanced Details (Barcode, HUID, Supplier, Purchase Cost)</span>
          <span className="text-xs text-muted">{showAdvanced ? "Hide" : "Show"}</span>
        </button>

        {showAdvanced && (
          <div className="grid gap-4 border-t border-border p-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="barcode">Barcode</label>
              <input id="barcode" className="field num" {...form.register("barcode")} />
            </div>
            <div>
              <label className="label" htmlFor="huid">Hallmark HUID</label>
              <input id="huid" className="field num" placeholder="e.g. ABC123" {...form.register("huid")} />
            </div>
            <div>
              <label className="label" htmlFor="supplierId">Supplier / Karigar</label>
              <select id="supplierId" className="field" {...form.register("supplierId")}>
                <option value="">None / Self Stock</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="purchaseCost">Purchase Cost (₹)</label>
              <input id="purchaseCost" type="number" step="any" className="field num" {...form.register("purchaseCost")} />
            </div>
            <div>
              <label className="label" htmlFor="locationId">Storage Location</label>
              <select id="locationId" className="field" {...form.register("locationId")}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="netWeightOverride">Manual Net Wt Override (if required)</label>
              <input id="netWeightOverride" type="number" step="any" className="field num" placeholder="Leave empty for auto" {...form.register("netWeightOverride")} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label" htmlFor="notes">Notes</label>
              <textarea id="notes" rows={2} className="field" {...form.register("notes")} />
            </div>
          </div>
        )}
      </section>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pb-6">
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="btn btn-primary min-w-36" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          Add Stock Item
        </button>
      </div>
    </form>
  );
}
