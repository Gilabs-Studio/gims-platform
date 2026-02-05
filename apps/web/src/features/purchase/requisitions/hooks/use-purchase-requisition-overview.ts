import { useMemo } from "react";
import { useWatch, type Control } from "react-hook-form";

import type { PurchaseRequisitionFormData } from "../schemas/purchase-requisition.schema";

type EntityOption = { id: string; name?: string | null; code?: string | null };
type EmployeeOption = { id: string; name?: string | null; employee_code?: string | null };

function toNumber(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim().length > 0) {
		const n = Number(value);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}

function clampPercent(value: unknown): number {
	const n = toNumber(value);
	if (!Number.isFinite(n)) return 0;
	return Math.min(100, Math.max(0, n));
}

export interface PurchaseRequisitionOverviewInput {
	readonly control: Control<PurchaseRequisitionFormData>;
	readonly suppliers: EntityOption[];
	readonly paymentTerms: EntityOption[];
	readonly businessUnits: EntityOption[];
	readonly employees: EmployeeOption[];
}

export interface PurchaseRequisitionOverview {
	readonly requestDate: string;
	readonly supplierLabel: string;
	readonly paymentTermsLabel: string;
	readonly businessUnitLabel: string;
	readonly employeeLabel: string;
	readonly itemsCount: number;
	readonly subtotal: number;
	readonly taxRate: number;
	readonly taxAmount: number;
	readonly deliveryCost: number;
	readonly otherCost: number;
	readonly totalAmount: number;
}

export function usePurchaseRequisitionOverview({
	control,
	suppliers,
	paymentTerms,
	businessUnits,
	employees,
}: PurchaseRequisitionOverviewInput): PurchaseRequisitionOverview {
	const requestDate = useWatch({ control, name: "request_date" }) ?? "";
	const supplierId = useWatch({ control, name: "supplier_id" });
	const paymentTermsId = useWatch({ control, name: "payment_terms_id" });
	const businessUnitId = useWatch({ control, name: "business_unit_id" });
	const employeeId = useWatch({ control, name: "employee_id" });

	const rawItems = useWatch({ control, name: "items" });
	const rawTaxRate = useWatch({ control, name: "tax_rate" });
	const rawDeliveryCost = useWatch({ control, name: "delivery_cost" });
	const rawOtherCost = useWatch({ control, name: "other_cost" });

	const supplierLabel = useMemo(() => {
		if (!supplierId) return "";
		const s = suppliers.find((x) => x.id === supplierId);
		if (!s) return String(supplierId);
		return s.code ? `${s.code} - ${s.name ?? ""}`.trim() : (s.name ?? "");
	}, [suppliers, supplierId]);

	const paymentTermsLabel = useMemo(() => {
		if (!paymentTermsId) return "";
		const pt = paymentTerms.find((x) => x.id === paymentTermsId);
		if (!pt) return String(paymentTermsId);
		return pt.code ? `${pt.code} - ${pt.name ?? ""}`.trim() : (pt.name ?? "");
	}, [paymentTerms, paymentTermsId]);

	const businessUnitLabel = useMemo(() => {
		if (!businessUnitId) return "";
		const bu = businessUnits.find((x) => x.id === businessUnitId);
		return bu?.name ?? String(businessUnitId);
	}, [businessUnits, businessUnitId]);

	const employeeLabel = useMemo(() => {
		if (!employeeId) return "";
		const e = employees.find((x) => x.id === employeeId);
		if (!e) return String(employeeId);
		return e.employee_code ? `${e.employee_code} - ${e.name ?? ""}`.trim() : (e.name ?? "");
	}, [employees, employeeId]);

	const computed = useMemo(() => {
		const items = Array.isArray(rawItems) ? rawItems : [];
		const itemsCount = items.length;

		const subtotal = items.reduce((acc, item) => {
			const quantity = toNumber(item?.quantity);
			const purchasePrice = toNumber(item?.purchase_price);
			const discountRate = clampPercent(item?.discount);
			const lineGross = quantity * purchasePrice;
			const lineNet = lineGross * (1 - discountRate / 100);
			return acc + (Number.isFinite(lineNet) ? lineNet : 0);
		}, 0);

		const taxRate = clampPercent(rawTaxRate);
		const taxAmount = subtotal * (taxRate / 100);
		const deliveryCost = toNumber(rawDeliveryCost);
		const otherCost = toNumber(rawOtherCost);
		const totalAmount = subtotal + taxAmount + deliveryCost + otherCost;

		return {
			itemsCount,
			subtotal,
			taxRate,
			taxAmount,
			deliveryCost,
			otherCost,
			totalAmount,
		};
	}, [rawItems, rawTaxRate, rawDeliveryCost, rawOtherCost]);

	return {
		requestDate,
		supplierLabel,
		paymentTermsLabel,
		businessUnitLabel,
		employeeLabel,
		itemsCount: computed.itemsCount,
		subtotal: computed.subtotal,
		taxRate: computed.taxRate,
		taxAmount: computed.taxAmount,
		deliveryCost: computed.deliveryCost,
		otherCost: computed.otherCost,
		totalAmount: computed.totalAmount,
	};
}
