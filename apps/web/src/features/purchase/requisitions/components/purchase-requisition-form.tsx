"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import type { FieldErrors, Resolver, SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2, FileText, DollarSign, ShoppingCart, Calendar as CalendarIcon } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";

import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ButtonLoading } from "@/components/loading";
import { usePaginatedComboboxOptions } from "@/hooks/use-paginated-combobox-options";

import { toast } from "sonner";

import { supplierService } from "@/features/master-data/supplier/services/supplier-service";
import { useSupplier } from "@/features/master-data/supplier/hooks/use-suppliers";
import { paymentTermsService } from "@/features/master-data/payment-and-couriers/payment-terms/services/payment-terms-service";
import { businessUnitService } from "@/features/master-data/organization/services/organization-service";
import { employeeService } from "@/features/master-data/employee/services/employee-service";
import { productService } from "@/features/master-data/product/services/product-service";
import { SupplierDialog } from "@/features/master-data/supplier/components/supplier/supplier-dialog";
import { ProductDialog } from "@/features/master-data/product/components/product/product-dialog";
import { PaymentTermsDialog } from "@/features/master-data/payment-and-couriers/payment-terms/components/payment-terms-dialog";
import { BusinessUnitForm } from "@/features/master-data/organization/components/business-unit/business-unit-form";
import { EmployeeForm } from "@/features/master-data/employee/components/employee-form";

import {
	getPurchaseRequisitionSchema,
	type PurchaseRequisitionFormData,
} from "../schemas/purchase-requisition.schema";
import {
	useCreatePurchaseRequisition,
	usePurchaseRequisition,
	useUpdatePurchaseRequisition,
} from "../hooks/use-purchase-requisitions";
import { usePurchaseRequisitionOverview } from "../hooks/use-purchase-requisition-overview";

function todayISO(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function isUUIDLike(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function normalizeEmployeeId(
	employeeId: string | null | undefined,
	employees: Array<{ id?: string; employee_code?: string }>,
): string | null {
	if (!employeeId) return null;
	if (isUUIDLike(employeeId)) return employeeId;
	const match = employees.find(
		(e) => e.id === employeeId || e.employee_code === employeeId,
	);
	return match?.id && isUUIDLike(match.id) ? match.id : null;
}

function collectErrorPaths(errs: FieldErrors, prefix = ""): string[] {
	const out: string[] = [];
	for (const [key, value] of Object.entries(errs)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (!value) continue;
		if (Array.isArray(value)) {
			value.forEach((child, idx) => {
				if (child) out.push(...collectErrorPaths(child as FieldErrors, `${path}[${idx}]`));
			});
			continue;
		}
		const maybeLeaf = value as { message?: unknown };
		if (typeof maybeLeaf.message === "string" && maybeLeaf.message.length > 0) {
			out.push(path);
			continue;
		}
		out.push(...collectErrorPaths(value as FieldErrors, path));
	}
	return Array.from(new Set(out));
}

type QuickCreateType = "supplier" | "paymentTerm" | "businessUnit" | "employee" | "product" | null;

interface PurchaseRequisitionFormProps {
	readonly open: boolean;
	readonly onClose: () => void;
	readonly requisitionId?: string | null;
}

export function PurchaseRequisitionForm({ open, onClose, requisitionId }: PurchaseRequisitionFormProps) {
	const t = useTranslations("purchaseRequisition");
	const isEdit = !!requisitionId;

	const createMutation = useCreatePurchaseRequisition();
	const updateMutation = useUpdatePurchaseRequisition();

	const [activeTab, setActiveTab] = useState<"basic" | "items">("basic");
	const [requestDateOpen, setRequestDateOpen] = useState(false);
	const [shouldLoadSelectData, setShouldLoadSelectData] = useState(true);
	const [quickCreate, setQuickCreate] = useState<{ type: QuickCreateType }>({ type: null });
	const openQuickCreate = useCallback((type: QuickCreateType) => setQuickCreate({ type }), []);
	const closeQuickCreate = useCallback(() => setQuickCreate({ type: null }), []);

	const { data: detailData, isFetching: isFetchingDetail } = usePurchaseRequisition(
		requisitionId ?? "",
		{ enabled: open && isEdit && !!requisitionId },
	);
	const detail = detailData?.data;

	const schema = useMemo(() => getPurchaseRequisitionSchema(), []);
	const resolver = zodResolver(schema) as Resolver<PurchaseRequisitionFormData>;

	const {
		register,
		handleSubmit,
		control,
		reset,
		setValue,
		formState: { errors },
	} = useForm<PurchaseRequisitionFormData>({
		resolver,
		defaultValues: {
			supplier_id: null,
			supplier_contact_id: null,
			payment_terms_id: null,
			business_unit_id: null,
			employee_id: null,
			request_date: todayISO(),
			address: null,
			notes: "",
			tax_rate: 0,
			delivery_cost: 0,
			other_cost: 0,
			items: [{ product_id: "", quantity: 1, purchase_price: 0, discount: 0, notes: null }],
		},
	});

	const { fields, append, remove } = useFieldArray({ control, name: "items" });
	const watchedItems = useWatch({ control, name: "items" });
	const selectedSupplierId = useWatch({ control, name: "supplier_id" });

	useEffect(() => {
		if (!open) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setActiveTab("basic");
			return;
		}
		if (!isEdit) {
			reset({
					supplier_id: null, supplier_contact_id: null, payment_terms_id: null, business_unit_id: null, employee_id: null,
				request_date: todayISO(), address: null, notes: "", tax_rate: 0, delivery_cost: 0, other_cost: 0,
				items: [{ product_id: "", quantity: 1, purchase_price: 0, discount: 0, notes: null }],
			});
			return;
		}
		if (!detail) return;
		reset({
				supplier_id: detail.supplier_id ?? null, supplier_contact_id: null, payment_terms_id: detail.payment_terms_id ?? null,
			business_unit_id: detail.business_unit_id ?? null, employee_id: detail.employee_id ?? null,
			request_date: detail.request_date, address: detail.address ?? null, notes: detail.notes ?? "",
			tax_rate: detail.tax_rate ?? 0, delivery_cost: detail.delivery_cost ?? 0, other_cost: detail.other_cost ?? 0,
			items: detail.items?.length > 0
				? detail.items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, purchase_price: it.purchase_price, discount: it.discount ?? 0, notes: it.notes ?? null }))
				: [{ product_id: "", quantity: 1, purchase_price: 0, discount: 0, notes: null }],
		});
	}, [detail, isEdit, open, reset]);

	const supplierCombobox = usePaginatedComboboxOptions({
		queryKey: ["purchase", "requisition", "suppliers"],
		queryFn: (params: { page: number; per_page: number; search?: string }) =>
			supplierService.list({
				...params,
				sort_by: "name",
				sort_dir: "asc",
			}),
		mapOption: (item) => ({
			value: item.id,
			label: item.code ? `${item.code} - ${item.name}` : item.name,
		}),
		enabled: open && shouldLoadSelectData,
		pinnedOptions:
			detail?.supplier?.id
				? [{ value: detail.supplier.id, label: detail.supplier.code ? `${detail.supplier.code} - ${detail.supplier.name}` : detail.supplier.name }]
				: undefined,
	});



	const employeesCombobox = usePaginatedComboboxOptions({
		queryKey: ["purchase", "requisition", "employees"],
		queryFn: (params: { page: number; per_page: number; search?: string }) =>
			employeeService.list({
				...params,
				sort_by: "name",
				sort_dir: "asc",
			}),
		mapOption: (item) => ({
			value: item.id,
			label: item.employee_code ? `${item.employee_code} - ${item.name}` : item.name,
		}),
		enabled: open && shouldLoadSelectData,
		pinnedOptions:
			detail?.employee?.id
				? [{ value: detail.employee.id, label: detail.employee.name }]
				: undefined,
	});

	const productsCombobox = usePaginatedComboboxOptions({
		queryKey: ["purchase", "requisition", "products"],
		queryFn: (params: { page: number; per_page: number; search?: string }) =>
			productService.list({
				...params,
				is_approved: true,
				sort_by: "name",
				sort_dir: "asc",
			}),
		mapOption: (item) => ({
			value: item.id,
			label: item.code ? `${item.code} - ${item.name}` : item.name,
		}),
		enabled: open && shouldLoadSelectData,
		pinnedOptions:
			detail?.items?.length
				? detail.items
					.filter((item) => item.product?.id)
					.map((item) => ({
						value: item.product_id,
						label: item.product?.code ? `${item.product.code} - ${item.product.name}` : item.product?.name ?? item.product_id,
					}))
				: undefined,
	});

	const products = useMemo(() => productsCombobox.items, [productsCombobox.items]);
	const suppliers = useMemo(() => supplierCombobox.items, [supplierCombobox.items]);
	const employees = useMemo(() => employeesCombobox.items, [employeesCombobox.items]);

	const mergedSuppliers = useMemo(() => {
		return [...suppliers];
	}, [suppliers]);

	const selectedSupplier = useMemo(() => {
		if (!selectedSupplierId) return null;
		return mergedSuppliers.find((s) => s.id === selectedSupplierId) ?? null;
	}, [selectedSupplierId, mergedSuppliers]);

	const { data: selectedSupplierData } = useSupplier(selectedSupplierId ?? "", {
		enabled: open && !!selectedSupplierId,
	});

	const selectedSupplierWithDetail = selectedSupplierData?.data ?? selectedSupplier;

	const paymentTermsCombobox = usePaginatedComboboxOptions({
		queryKey: ["purchase", "requisition", "payment-terms"],
		queryFn: (params: { page: number; per_page: number; search?: string }) =>
			paymentTermsService.list({
				...params,
				sort_by: "name",
				sort_dir: "asc",
			}),
		mapOption: (item) => ({
			value: item.id,
			label: item.name,
		}),
		enabled: open && shouldLoadSelectData,
		pinnedOptions: (() => {
			const options = [];
			if (detail?.payment_terms?.id) {
				options.push({ value: detail.payment_terms.id, label: detail.payment_terms.name });
			}
			if (selectedSupplierWithDetail?.payment_terms_id) {
				options.push({
					value: selectedSupplierWithDetail.payment_terms_id,
					label:
						selectedSupplierWithDetail.payment_terms?.name ??
						detail?.payment_terms?.name ??
						selectedSupplierWithDetail.payment_terms_id,
				});
			}
			return options.length ? options : undefined;
		})(),
	});

	const businessUnitsCombobox = usePaginatedComboboxOptions({
		queryKey: ["purchase", "requisition", "business-units"],
		queryFn: (params: { page: number; per_page: number; search?: string }) =>
			businessUnitService.list({
				...params,
				sort_by: "name",
				sort_dir: "asc",
			}),
		mapOption: (item) => ({
			value: item.id,
			label: item.name,
		}),
		enabled: open && shouldLoadSelectData,
		pinnedOptions: (() => {
			const options = [];
			if (detail?.business_unit?.id) {
				options.push({ value: detail.business_unit.id, label: detail.business_unit.name });
			}
			if (selectedSupplierWithDetail?.business_unit_id) {
				options.push({
					value: selectedSupplierWithDetail.business_unit_id,
					label:
						selectedSupplierWithDetail.business_unit?.name ??
						detail?.business_unit?.name ??
						selectedSupplierWithDetail.business_unit_id,
				});
			}
			return options.length ? options : undefined;
		})(),
	});

	const paymentTerms = useMemo(() => paymentTermsCombobox.items, [paymentTermsCombobox.items]);
	const businessUnits = useMemo(() => businessUnitsCombobox.items, [businessUnitsCombobox.items]);
	const supplierContacts = useMemo(
		() => selectedSupplierWithDetail?.contacts ?? [],
		[selectedSupplierWithDetail],
	);

	useEffect(() => {
		if (!selectedSupplierId) {
			setValue("payment_terms_id", null, { shouldValidate: true });
			setValue("business_unit_id", null, { shouldValidate: true });
			setValue("supplier_contact_id", null, { shouldValidate: true });
			return;
		}

		if (!selectedSupplierWithDetail) return;

		const nextPaymentTermsId =
			selectedSupplierWithDetail.payment_terms_id ??
			selectedSupplierWithDetail.payment_terms?.id ??
			null;
		const nextBusinessUnitId =
			selectedSupplierWithDetail.business_unit_id ??
			selectedSupplierWithDetail.business_unit?.id ??
			null;
		const contacts = selectedSupplierWithDetail.contacts ?? [];
		const defaultContact = contacts.find((ct) => ct.is_primary) ?? contacts[0];
		const nextSupplierContactId = defaultContact?.id ?? null;

		setValue("payment_terms_id", nextPaymentTermsId, {
			shouldValidate: true,
			shouldDirty: true,
		});
		setValue("business_unit_id", nextBusinessUnitId, {
			shouldValidate: true,
			shouldDirty: true,
		});
		setValue("supplier_contact_id", nextSupplierContactId, {
			shouldValidate: true,
			shouldDirty: true,
		});

	}, [selectedSupplierId, selectedSupplierWithDetail, setValue, selectedSupplierData?.data]);

	const mergedPaymentTerms = useMemo(() => {
		return [...paymentTerms];
	}, [paymentTerms]);

	const mergedBusinessUnits = useMemo(() => {
		return [...businessUnits];
	}, [businessUnits]);

	const mergedEmployees = useMemo(() => [...employees], [employees]);

	const overview = usePurchaseRequisitionOverview({
		control, suppliers: mergedSuppliers, paymentTerms: mergedPaymentTerms,
		businessUnits: mergedBusinessUnits, employees: mergedEmployees,
	});

	const formatMoney = useCallback((value: number | null | undefined): string => {
		return formatCurrency(value ?? 0);
	}, []);

	const handleSupplierCreated = useCallback((item: { id: string; name: string }) => {
		setValue("supplier_id", item.id); closeQuickCreate();
	}, [setValue, closeQuickCreate]);
	const handlePaymentTermCreated = useCallback((item: { id: string; name: string }) => {
		setValue("payment_terms_id", item.id); closeQuickCreate();
	}, [setValue, closeQuickCreate]);
	const handleBusinessUnitCreated = useCallback((item: { id: string; name: string }) => {
		setValue("business_unit_id", item.id); closeQuickCreate();
	}, [setValue, closeQuickCreate]);
	const handleEmployeeCreated = useCallback((item: { id: string; name: string }) => {
		const normalized = normalizeEmployeeId(item.id, mergedEmployees);
		setValue("employee_id", normalized ?? item.id); closeQuickCreate();
	}, [setValue, closeQuickCreate, mergedEmployees]);
	const handleProductCreated = useCallback(() => {
		closeQuickCreate();
	}, [closeQuickCreate]);

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const onSubmit = async (formData: PurchaseRequisitionFormData) => {
		const payload = {
			supplier_id: formData.supplier_id ?? null, payment_terms_id: formData.payment_terms_id ?? null,
			business_unit_id: formData.business_unit_id ?? null, employee_id: formData.employee_id ?? null,
			supplier_contact_id: formData.supplier_contact_id ?? null,
			request_date: formData.request_date, address: formData.address ?? null, notes: formData.notes ?? "",
			tax_rate: formData.tax_rate ?? 0, delivery_cost: formData.delivery_cost ?? 0, other_cost: formData.other_cost ?? 0,
			items: (formData.items ?? []).map((it) => ({ product_id: it.product_id, quantity: it.quantity, purchase_price: it.purchase_price, discount: it.discount ?? 0, notes: it.notes ?? null })),
		};
		try {
			if (isEdit && requisitionId) {
				await updateMutation.mutateAsync({ id: requisitionId, data: payload });
				toast.success(t("toast.updated"));
			} else {
				await createMutation.mutateAsync(payload);
				toast.success(t("toast.created"));
			}
			onClose();
		} catch { toast.error(t("toast.failed")); }
	};

	const onInvalid: SubmitErrorHandler<PurchaseRequisitionFormData> = (errs) => {
		const paths = collectErrorPaths(errs);
		toast.error(paths.length ? `${t("form.invalid")}: ${paths.join(", ")}` : t("form.invalid"));
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
				</DialogHeader>

				{isFetchingDetail ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : (
				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "basic" | "items")} className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="basic">{t("tabs.basic") || "Basic Info"}</TabsTrigger>
						<TabsTrigger value="items">{t("tabs.items") || "Items"}</TabsTrigger>
					</TabsList>

					<form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 mt-4">
						<TabsContent value="basic" className="space-y-4 mt-0">
						{/* Order Information Section */}
						<div className="space-y-4">
							<div className="flex items-center space-x-2 pb-2 border-b border-border/50">
								<FileText className="h-4 w-4 text-primary" />
								<h3 className="text-sm font-medium">{t("sections.orderInfo") || "Order Information"}</h3>
							</div>
							<div className="grid grid-cols-1 gap-4">
									<Field orientation="vertical">
										<FieldLabel>{t("fields.requestedBy") || "Request By"}</FieldLabel>
										<Controller
											control={control} name="employee_id"
											render={({ field }) => (
												<CreatableCombobox
													value={field.value ?? undefined}
													onValueChange={(v) => field.onChange(v ? normalizeEmployeeId(v, mergedEmployees) : null)}
													onOpenChange={(isOpen) => {
														if (isOpen) {
															setShouldLoadSelectData(true);
														}
														employeesCombobox.onOpenChange(isOpen);
													}}
													onSearchChange={employeesCombobox.onSearchChange}
													onLoadMore={employeesCombobox.onLoadMore}
													hasMore={employeesCombobox.hasMore}
													isLoadingMore={employeesCombobox.isLoadingMore}
													searchDebounceMs={300}
													options={mergedEmployees.map((e) => ({ value: e.id, label: e.employee_code ? `${e.employee_code} - ${e.name}` : e.name }))}
													placeholder={t("placeholders.select")}
													createPermission="employee.create"
													createLabel={t("actions.createNew") || "Create Employee"}
													onCreateClick={() => openQuickCreate("employee")}
													isLoading={employeesCombobox.isLoading || employeesCombobox.isFetching}
												/>
											)}
										/>
									</Field>

									<Field orientation="vertical">
										<FieldLabel>{t("fields.requestDate")}</FieldLabel>
										<Controller
											control={control}
											name="request_date"
											render={({ field }) => (
												<Popover open={requestDateOpen} onOpenChange={setRequestDateOpen}>
													<PopoverTrigger asChild>
														<Button type="button" variant="outline" className="w-full justify-start text-left font-normal cursor-pointer">
															<CalendarIcon className="mr-2 h-4 w-4" />
															{field.value ? formatDate(field.value) : t("placeholders.pickDate") || "Pick a date"}
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-auto p-0" align="start">
														<Calendar
															mode="single"
															selected={field.value ? new Date(field.value) : undefined}
															onSelect={(date: Date | undefined) => {
																field.onChange(date ? date.toISOString().slice(0, 10) : "");
																setRequestDateOpen(false);
															}}
														/>
													</PopoverContent>
												</Popover>
											)}
										/>
										{errors.request_date && <FieldError>{t("validation.required")}</FieldError>}
									</Field>
										</div>
									</div>

									{/* Procurement Section */}
									<div className="space-y-4">
										<div className="flex items-center space-x-2 pb-2 border-b border-border/50">
											<ShoppingCart className="h-4 w-4 text-primary" />
											<h3 className="text-sm font-medium">{t("sections.procurement") || "Procurement"}</h3>
										</div>
										<div className="grid grid-cols-2 gap-4">
									<Field orientation="vertical">
										<FieldLabel>{t("fields.supplier")}</FieldLabel>
										<Controller
											control={control} name="supplier_id"
											render={({ field }) => (
												<CreatableCombobox
													value={field.value ?? undefined}
													onValueChange={(v) => {
														const selectedId = v || null;
														field.onChange(selectedId);
														const supplierFromList = mergedSuppliers.find((s) => s.id === selectedId);
														const supplier = selectedSupplierWithDetail ?? supplierFromList;
														const nextPaymentTermsId =
															(supplier?.payment_terms_id?.trim() ? supplier.payment_terms_id : null) ??
															supplier?.payment_terms?.id ??
															null;
														const nextBusinessUnitId =
															(supplier?.business_unit_id?.trim() ? supplier.business_unit_id : null) ??
															supplier?.business_unit?.id ??
															null;
														const nextSupplierContacts = supplier?.contacts ?? [];
														const defaultContact =
															nextSupplierContacts.find((ct: { is_primary?: boolean; id?: string }) => ct.is_primary) ?? nextSupplierContacts[0];
														const nextSupplierContactId = defaultContact?.id ?? null;
														if (nextPaymentTermsId !== null) {
															setValue('payment_terms_id', nextPaymentTermsId, { shouldValidate: true, shouldDirty: true });
														}
														setValue("business_unit_id", nextBusinessUnitId, { shouldValidate: true, shouldDirty: true });
														setValue("supplier_contact_id", nextSupplierContactId, { shouldValidate: true, shouldDirty: true });

													}}
													onOpenChange={(isOpen) => {
														if (isOpen) {
															setShouldLoadSelectData(true);
														}
														supplierCombobox.onOpenChange(isOpen);
													}}
													onSearchChange={supplierCombobox.onSearchChange}
													onLoadMore={supplierCombobox.onLoadMore}
													hasMore={supplierCombobox.hasMore}
													isLoadingMore={supplierCombobox.isLoadingMore}
													searchDebounceMs={300}
													options={mergedSuppliers.map((s) => ({ value: s.id, label: s.code ? `${s.code} - ${s.name}` : s.name }))}
													placeholder={t("placeholders.select")}
													createPermission="supplier.create"
													createLabel={t("actions.createNew") || "Create New Supplier"}
													onCreateClick={() => openQuickCreate("supplier")}
													isLoading={supplierCombobox.isLoading || supplierCombobox.isFetching}
												/>
											)}
										/>
									</Field>

									<Field orientation="vertical">
										<FieldLabel>{t("fields.supplierContact") || "Supplier Contact"}</FieldLabel>
										<Controller
											control={control}
											name="supplier_contact_id"
											render={({ field }) => (
												<Select
													value={field.value ?? ""}
													onValueChange={(v) => field.onChange(v || null)}
													disabled={!selectedSupplierId || supplierContacts.length === 0}
												>
													<SelectTrigger className="cursor-pointer">
														<SelectValue placeholder={t("placeholders.select")} />
													</SelectTrigger>
													<SelectContent>
														{supplierContacts.map((contact) => (
															<SelectItem key={contact.id} value={contact.id} className="cursor-pointer">
																{contact.phone}{contact.is_primary ? " - Primary" : ""}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
									</Field>

									<Field orientation="vertical">
										<FieldLabel>{t("fields.paymentTerms")}</FieldLabel>
										<Controller
											control={control} name="payment_terms_id"
											render={({ field }) => (
												<CreatableCombobox
													value={field.value ?? undefined}
													onValueChange={(v) => field.onChange(v || null)}
													onOpenChange={(isOpen) => {
														if (isOpen) {
															setShouldLoadSelectData(true);
														}
														paymentTermsCombobox.onOpenChange(isOpen);
													}}
													onSearchChange={paymentTermsCombobox.onSearchChange}
													onLoadMore={paymentTermsCombobox.onLoadMore}
													hasMore={paymentTermsCombobox.hasMore}
													isLoadingMore={paymentTermsCombobox.isLoadingMore}
													searchDebounceMs={300}
													options={paymentTermsCombobox.options}
													placeholder={t("placeholders.select")}
													createPermission="payment_term.create"
													createLabel={t("actions.createNew") || "Create Payment Term"}
													onCreateClick={() => openQuickCreate("paymentTerm")}
													isLoading={paymentTermsCombobox.isLoading || paymentTermsCombobox.isFetching}
												/>
											)}
										/>
									</Field>

									<Field orientation="vertical">
										<FieldLabel>{t("fields.businessUnit")}</FieldLabel>
										<Controller
											control={control} name="business_unit_id"
											render={({ field }) => (
												<CreatableCombobox
													value={field.value ?? undefined}
													onValueChange={(v) => field.onChange(v || null)}
													onOpenChange={(isOpen) => {
														if (isOpen) {
															setShouldLoadSelectData(true);
														}
														businessUnitsCombobox.onOpenChange(isOpen);
													}}
													onSearchChange={businessUnitsCombobox.onSearchChange}
													onLoadMore={businessUnitsCombobox.onLoadMore}
													hasMore={businessUnitsCombobox.hasMore}
													isLoadingMore={businessUnitsCombobox.isLoadingMore}
													searchDebounceMs={300}
													options={businessUnitsCombobox.options}
													placeholder={t("placeholders.select")}
													createPermission="business_unit.create"
													createLabel={t("actions.createNew") || "Create Business Unit"}
													onCreateClick={() => openQuickCreate("businessUnit")}
													isLoading={businessUnitsCombobox.isLoading || businessUnitsCombobox.isFetching}
												/>
											)}
										/>
									</Field>
								</div>
							</div>

							{/* Financial Section */}
							<div className="space-y-4">
								<div className="flex items-center space-x-2 pb-2 border-b border-border/50">
									<DollarSign className="h-4 w-4 text-primary" />
									<h3 className="text-sm font-medium">{t("sections.financial") || "Financial"}</h3>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<Field orientation="vertical">
										<FieldLabel>{t("fields.taxRate")}</FieldLabel>
										<Controller control={control} name="tax_rate" render={({ field }) => (
											<NumericInput value={field.value ?? 0} onChange={field.onChange} />
										)} />
									</Field>
									<Field orientation="vertical">
										<FieldLabel>{t("fields.deliveryCost")}</FieldLabel>
										<Controller control={control} name="delivery_cost" render={({ field }) => (
											<NumericInput value={field.value ?? 0} onChange={field.onChange} />
										)} />
									</Field>
									<Field orientation="vertical">
										<FieldLabel>{t("fields.otherCost")}</FieldLabel>
										<Controller control={control} name="other_cost" render={({ field }) => (
											<NumericInput value={field.value ?? 0} onChange={field.onChange} />
										)} />
									</Field>
								</div>
								<Field orientation="vertical">
									<FieldLabel>{t("fields.address") || "Address"}</FieldLabel>
									<Input {...register("address")} placeholder={t("placeholders.address") || "Delivery address"} />
								</Field>
								<Field orientation="vertical">
									<FieldLabel>{t("fields.notes")}</FieldLabel>
									<Textarea rows={3} {...register("notes")} />
									{errors.notes && <FieldError>{t("validation.invalid")}</FieldError>}
								</Field>
							</div>

							<div className="flex items-center justify-end gap-2 pt-4 border-t">
								<Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
									{t("actions.cancel")}
								</Button>
								<Button type="button" onClick={() => setActiveTab("items")} className="cursor-pointer">
									{t("common.next") || "Next"}
								</Button>
							</div>
						</TabsContent>

						<TabsContent value="items" className="space-y-4 mt-0">
							{/* Items and Summary Grid Layout */}
							<div className="grid grid-cols-3 gap-6">
								{/* Items Section - Left Column (2 cols) */}
								<div className="col-span-2 space-y-4">
									<div className="flex items-center space-x-2 pb-2 border-b border-border/50">
										<ShoppingCart className="h-4 w-4 text-primary" />
										<h3 className="text-sm font-medium">{t("fields.items")} ({fields.length})</h3>
									</div>

									<div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
										{fields.map((f, idx) => {
											const item = watchedItems?.[idx];
											const itemSubtotal = item
												? (item.purchase_price ?? 0) * (item.quantity ?? 1) * (1 - ((item.discount ?? 0) / 100))
												: 0;
											return (
												<div
													key={f.id}
													className="relative border rounded-lg p-4 space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow"
												>
													<div className="absolute top-2 right-2 flex items-center gap-2">
														<span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded">#{idx + 1}</span>
														{fields.length > 1 && (
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => remove(idx)}
																className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														)}
													</div>

													<div className="grid grid-cols-2 gap-3 mt-6">
														<Field orientation="vertical" className="col-span-2">
															<FieldLabel>{t("fields.product")} *</FieldLabel>
															<Controller
																control={control} name={`items.${idx}.product_id`}
																render={({ field }) => (
																	<CreatableCombobox
																		value={field.value || undefined}
																		onValueChange={(v) => {
																			field.onChange(v || "");
																			if (v) {
																				const found = products.find((p) => p.id === v);
																				if (found?.cost_price !== undefined) {
																					setValue(`items.${idx}.purchase_price`, found.cost_price, { shouldValidate: true });
																				}
																			}
																		}}
																		onOpenChange={(isOpen) => {
																			if (isOpen) {
																				setShouldLoadSelectData(true);
																			}
																			productsCombobox.onOpenChange(isOpen);
																		}}
																		onSearchChange={productsCombobox.onSearchChange}
																		onLoadMore={productsCombobox.onLoadMore}
																		hasMore={productsCombobox.hasMore}
																		isLoadingMore={productsCombobox.isLoadingMore}
																		searchDebounceMs={300}
																		options={products.map((p) => ({ value: p.id, label: p.code ? `${p.code} - ${p.name}` : p.name }))}
																		placeholder={t("placeholders.select")}
																		createPermission="product.create"
																		createLabel={t("actions.createNew") || "Create Product"}
																		onCreateClick={() => openQuickCreate("product")}
																		isLoading={productsCombobox.isLoading || productsCombobox.isFetching}
																	/>
																)}
															/>
															{errors.items?.[idx]?.product_id && <FieldError>{t("validation.required")}</FieldError>}
														</Field>

														<Field orientation="vertical">
															<FieldLabel>{t("fields.quantity")} *</FieldLabel>
															<Controller control={control} name={`items.${idx}.quantity`}
																render={({ field }) => <NumericInput value={field.value ?? 1} onChange={field.onChange} />}
															/>
														</Field>

														<Field orientation="vertical">
															<FieldLabel>{t("fields.purchasePrice")} *</FieldLabel>
															<Controller control={control} name={`items.${idx}.purchase_price`}
																render={({ field }) => <NumericInput value={field.value ?? 0} onChange={field.onChange} />}
															/>
														</Field>

														<Field orientation="vertical">
															<FieldLabel>{t("fields.discount")}</FieldLabel>
															<Controller control={control} name={`items.${idx}.discount`}
																render={({ field }) => <NumericInput value={field.value ?? 0} onChange={field.onChange} />}
															/>
														</Field>

														<Field orientation="vertical" className="col-span-2">
															<FieldLabel>{t("fields.notes")}</FieldLabel>
															<Controller control={control} name={`items.${idx}.notes`}
																render={({ field }) => (
																	<Input value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
																)}
															/>
														</Field>

														<div className="col-span-2 pt-2 border-t border-border/50">
															<div className="flex items-center justify-between">
																<span className="text-sm font-medium text-muted-foreground">{t("fields.subtotal")}:</span>
																<span className="text-base font-bold text-primary">{formatMoney(itemSubtotal)}</span>
															</div>
														</div>
													</div>
												</div>
											);
										})}
									</div>

									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => append({ product_id: "", quantity: 1, purchase_price: 0, discount: 0, notes: null })}
										className="w-full cursor-pointer border-dashed"
									>
										<Plus className="h-4 w-4 mr-2" />
										{t("actions.addItem")}
									</Button>
								</div>

								{/* Totals Summary - Right Column */}
								<div className="col-span-1">
									<div className="sticky space-y-4">
										<div className="flex items-center space-x-2 pb-2 border-b border-border/50">
											<DollarSign className="h-4 w-4 text-primary" />
											<h3 className="text-sm font-medium">{t("form.overviewTitle")}</h3>
										</div>
	
										<div className="space-y-3">
											<div className="flex flex-wrap items-end gap-1">
												<span className="text-muted-foreground text-sm">{t("fields.subtotal")}:</span>
												<span className="font-medium ml-auto">{formatMoney(overview.subtotal)}</span>
											</div>
											<div className="flex flex-wrap items-end gap-1">
												<span className="text-muted-foreground text-sm">{t("fields.taxAmount")}:</span>
												<span className="font-medium ml-auto">{formatMoney(overview.taxAmount)}</span>
											</div>
											<div className="flex flex-wrap items-end gap-1">
												<span className="text-muted-foreground text-sm">{t("fields.deliveryCost")}:</span>
												<span className="font-medium ml-auto">{formatMoney(overview.deliveryCost)}</span>
											</div>
											<div className="flex flex-wrap items-end gap-1">
												<span className="text-muted-foreground text-sm">{t("fields.otherCost")}:</span>
												<span className="font-medium ml-auto">{formatMoney(overview.otherCost)}</span>
											</div>
											<div className="flex flex-wrap items-end gap-1 border-t pt-3 mt-2">
												<span className="text-lg font-bold">{t("fields.total")}:</span>
												<span className="text-lg font-bold text-primary ml-auto">{formatMoney(overview.totalAmount)}</span>
											</div>
										</div>
									</div>
								</div>
							</div>

						<div className="flex items-center justify-between pt-4 border-t">
							<Button type="button" variant="outline" onClick={() => setActiveTab("basic")} className="cursor-pointer">
								{t("common.back") || "Back"}
							</Button>
							<div className="flex gap-2">
								<Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
									{t("actions.cancel")}
								</Button>
								<Button type="submit" disabled={isSubmitting || isFetchingDetail} className="cursor-pointer">
									<ButtonLoading loading={isSubmitting} loadingText={t("actions.saving") || "Saving..."}>
										{isEdit ? t("actions.save") : t("actions.create") || "Create"}
									</ButtonLoading>
								</Button>
							</div>
						</div>
						</TabsContent>
					</form>
				</Tabs>
				)}
			</DialogContent>

			{quickCreate.type === "supplier" && (
				<SupplierDialog
					open
					onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
					editingItem={null}
					onCreated={handleSupplierCreated}
				/>
			)}
			{quickCreate.type === "paymentTerm" && (
				<PaymentTermsDialog
					open
					onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
					editingItem={null}
					onCreated={handlePaymentTermCreated}
				/>
			)}
			{quickCreate.type === "businessUnit" && (
				<BusinessUnitForm
					open
					onClose={closeQuickCreate}
					onCreated={handleBusinessUnitCreated}
				/>
			)}
			{quickCreate.type === "employee" && (
				<EmployeeForm
					open
					onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
					onCreated={handleEmployeeCreated}
				/>
			)}
			{quickCreate.type === "product" && (
				<ProductDialog
					open
					onOpenChange={(v) => { if (!v) closeQuickCreate(); }}
					editingItem={null}
					onCreated={handleProductCreated}
				/>
			)}
		</Dialog>
	);
}
