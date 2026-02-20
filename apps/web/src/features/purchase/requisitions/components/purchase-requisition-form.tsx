"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import type { FieldErrors, Resolver, SubmitErrorHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NumericInput } from "@/components/ui/numeric-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";

import { useProducts } from "@/features/master-data/product/hooks/use-products";
import { usePurchaseRequisitionAddData } from "../hooks/use-purchase-requisitions";
import { usePaymentTerms } from "@/features/master-data/payment-and-couriers/payment-terms/hooks/use-payment-terms";
import { useBusinessUnits } from "@/features/master-data/organization/hooks/use-business-units";
import { useEmployee, useEmployees } from "@/features/master-data/employee/hooks/use-employees";

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

function formatMoney(value: number | null | undefined): string {
	const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(safe);
}

function todayISO(): string {
	const d = new Date();
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

const NONE_VALUE = "__none__";

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
		// react-hook-form error leaf often has { type, message, ref }
		const maybeLeaf = value as { message?: unknown };
		if (typeof maybeLeaf.message === "string" && maybeLeaf.message.length > 0) {
			out.push(path);
			continue;
		}
		// nested object
		out.push(...collectErrorPaths(value as FieldErrors, path));
	}
	return Array.from(new Set(out));
}

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
		formState: { errors },
	} = useForm<PurchaseRequisitionFormData>({
		resolver,
		defaultValues: {
			supplier_id: null,
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

	const { fields, append, remove } = useFieldArray({
		control,
		name: "items",
	});

	useEffect(() => {
		if (!open) return;
		if (!isEdit) {
			reset({
				supplier_id: null,
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
			});
			return;
		}
		if (!detail) return;

		reset({
			supplier_id: detail.supplier_id ?? null,
			payment_terms_id: detail.payment_terms_id ?? null,
			business_unit_id: detail.business_unit_id ?? null,
			employee_id: detail.employee_id ?? null,
			request_date: detail.request_date,
			address: detail.address ?? null,
			notes: detail.notes ?? "",
			tax_rate: detail.tax_rate ?? 0,
			delivery_cost: detail.delivery_cost ?? 0,
			other_cost: detail.other_cost ?? 0,
			items:
				detail.items?.length > 0
					? detail.items.map((it) => ({
						product_id: it.product_id,
						quantity: it.quantity,
						purchase_price: it.purchase_price,
						discount: it.discount ?? 0,
						notes: it.notes ?? null,
					}))
					: [{ product_id: "", quantity: 1, purchase_price: 0, discount: 0, notes: null }],
		});
	}, [detail, isEdit, open, reset]);

	const addDataQuery = usePurchaseRequisitionAddData({ enabled: open });
	const { data: productsData } = useProducts({ per_page: 100, is_approved: true });
	const { data: paymentTermsData } = usePaymentTerms({ per_page: 100 });
	const { data: businessUnitsData } = useBusinessUnits({ per_page: 100 });
	const { data: employeesData } = useEmployees({ per_page: 100 });
	const selectedEmployeeId = detail?.employee_id ?? null;
	const { data: selectedEmployeeData } = useEmployee(
		open && isEdit && selectedEmployeeId ? selectedEmployeeId : undefined,
	);

	const products = useMemo(() => productsData?.data ?? [], [productsData?.data]);
	const suppliers = useMemo(
		() => addDataQuery.data?.data.suppliers ?? [],
		[addDataQuery.data?.data.suppliers],
	);
	const paymentTerms = useMemo(() => paymentTermsData?.data ?? [], [paymentTermsData?.data]);
	const businessUnits = useMemo(() => businessUnitsData?.data ?? [], [businessUnitsData?.data]);
	const employees = useMemo(() => employeesData?.data ?? [], [employeesData?.data]);

	const mergedSuppliers = useMemo(() => {
		const list = [...suppliers];
		const selected = detail?.supplier;
		if (selected && !list.some(x => x.id === selected.id)) {
			list.push(selected as any);
		}
		return list;
	}, [suppliers, detail?.supplier]);

	const mergedPaymentTerms = useMemo(() => {
		const list = [...paymentTerms];
		const selected = detail?.payment_terms;
		if (selected && !list.some(x => x.id === selected.id)) {
			list.push(selected as any);
		}
		return list;
	}, [paymentTerms, detail?.payment_terms]);

	const mergedBusinessUnits = useMemo(() => {
		const list = [...businessUnits];
		const selected = detail?.business_unit;
		if (selected && !list.some(x => x.id === selected.id)) {
			list.push(selected as any);
		}
		return list;
	}, [businessUnits, detail?.business_unit]);

	const selectedEmployee = selectedEmployeeData?.data ?? null;
	const mergedEmployees = useMemo(() => {
		if (!selectedEmployee) return employees;
		const exists = employees.some((e) => e.id === selectedEmployee.id);
		return exists ? employees : [selectedEmployee, ...employees];
	}, [employees, selectedEmployee]);

	const overview = usePurchaseRequisitionOverview({
		control,
		suppliers: mergedSuppliers,
		paymentTerms: mergedPaymentTerms,
		businessUnits: mergedBusinessUnits,
		employees: mergedEmployees,
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const onSubmit = async (formData: PurchaseRequisitionFormData) => {
		const payload = {
			supplier_id: formData.supplier_id ?? null,
			payment_terms_id: formData.payment_terms_id ?? null,
			business_unit_id: formData.business_unit_id ?? null,
			employee_id: formData.employee_id ?? null,
			request_date: formData.request_date,
			address: formData.address ?? null,
			notes: formData.notes ?? "",
			tax_rate: formData.tax_rate ?? 0,
			delivery_cost: formData.delivery_cost ?? 0,
			other_cost: formData.other_cost ?? 0,
			items: (formData.items ?? []).map((it) => ({
				product_id: it.product_id,
				quantity: it.quantity,
				purchase_price: it.purchase_price,
				discount: it.discount ?? 0,
				notes: it.notes ?? null,
			})),
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
		} catch {
			toast.error(t("toast.failed"));
		}
	};

	const onInvalid: SubmitErrorHandler<PurchaseRequisitionFormData> = (errs) => {
		const paths = collectErrorPaths(errs);
		const friendlyMap: Record<string, string> = {
			supplier_id: t("fields.supplier"),
			payment_terms_id: t("fields.paymentTerms"),
			business_unit_id: t("fields.businessUnit"),
			employee_id: t("fields.employee"),
			request_date: t("fields.requestDate"),
			tax_rate: t("fields.taxRate"),
			delivery_cost: t("fields.deliveryCost"),
			other_cost: t("fields.otherCost"),
		};
		const friendlyPaths = paths.map((p) => {
			const key = p.includes(".") ? p.split(".").pop() ?? p : p;
			return key && friendlyMap[key] ? friendlyMap[key] : p;
		});
		// Helps debugging when UI looks filled but RHF value is still invalid.
		console.warn("PurchaseRequisitionForm invalid", { paths, errs });
		toast.error(
			friendlyPaths.length
				? `${t("form.invalid")}: ${friendlyPaths.join(", ")}`
				: t("form.invalid"),
		);
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent size="2xl" className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? t("form.editTitle") : t("form.createTitle")}
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div className="space-y-6 md:col-span-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<Field>
									<FieldLabel>{t("fields.requestDate")}</FieldLabel>
									<Input type="date" {...register("request_date")} />
									{errors.request_date && (
										<FieldError>{t("validation.required")}</FieldError>
									)}
								</Field>

								<Field>
									<FieldLabel>{t("fields.supplier")}</FieldLabel>
									<Controller
										control={control}
										name="supplier_id"
										render={({ field }) => (
											<Select
												value={field.value ?? NONE_VALUE}
												onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
											>
												<SelectTrigger className="cursor-pointer">
													<SelectValue placeholder={t("placeholders.select")} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NONE_VALUE} className="cursor-pointer">
														{t("placeholders.none")}
													</SelectItem>
													{mergedSuppliers.map((s) => (
														<SelectItem key={s.id} value={s.id} className="cursor-pointer">
															{s.code ? `${s.code} - ${s.name}` : s.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</Field>

								<Field>
									<FieldLabel>{t("fields.paymentTerms")}</FieldLabel>
									<Controller
										control={control}
										name="payment_terms_id"
										render={({ field }) => (
											<Select
												value={field.value ?? NONE_VALUE}
												onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
											>
												<SelectTrigger className="cursor-pointer">
													<SelectValue placeholder={t("placeholders.select")} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NONE_VALUE} className="cursor-pointer">
														{t("placeholders.none")}
													</SelectItem>
													{mergedPaymentTerms.map((pt) => (
														<SelectItem key={pt.id} value={pt.id} className="cursor-pointer">
															{pt.code ? `${pt.code} - ${pt.name}` : pt.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</Field>

								<Field>
									<FieldLabel>{t("fields.businessUnit")}</FieldLabel>
									<Controller
										control={control}
										name="business_unit_id"
										render={({ field }) => (
											<Select
												value={field.value ?? NONE_VALUE}
												onValueChange={(v) => field.onChange(v === NONE_VALUE ? null : v)}
											>
												<SelectTrigger className="cursor-pointer">
													<SelectValue placeholder={t("placeholders.select")} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NONE_VALUE} className="cursor-pointer">
														{t("placeholders.none")}
													</SelectItem>
													{mergedBusinessUnits.map((bu) => (
														<SelectItem key={bu.id} value={bu.id} className="cursor-pointer">
															{bu.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</Field>

								<Field>
									<FieldLabel>{t("fields.employee")}</FieldLabel>
									<Controller
										control={control}
										name="employee_id"
										render={({ field }) => (
											<Select
												value={field.value ?? NONE_VALUE}
												onValueChange={(v) =>
													field.onChange(
														v === NONE_VALUE ? null : normalizeEmployeeId(v, mergedEmployees),
													)
												}
											>
												<SelectTrigger className="cursor-pointer">
													<SelectValue placeholder={t("placeholders.select")} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value={NONE_VALUE} className="cursor-pointer">
														{t("placeholders.none")}
													</SelectItem>
													{mergedEmployees.map((e) => (
														<SelectItem key={e.id} value={e.id} className="cursor-pointer">
															{e.employee_code ? `${e.employee_code} - ${e.name}` : e.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</Field>

								<Field>
									<FieldLabel>{t("fields.taxRate")}</FieldLabel>
									<Controller
										control={control}
										name="tax_rate"
										render={({ field }) => (
											<NumericInput value={field.value ?? 0} onChange={field.onChange} />
										)}
									/>
								</Field>

								<Field>
									<FieldLabel>{t("fields.deliveryCost")}</FieldLabel>
									<Controller
										control={control}
										name="delivery_cost"
										render={({ field }) => (
											<NumericInput value={field.value ?? 0} onChange={field.onChange} />
										)}
									/>
								</Field>

								<Field>
									<FieldLabel>{t("fields.otherCost")}</FieldLabel>
									<Controller
										control={control}
										name="other_cost"
										render={({ field }) => (
											<NumericInput value={field.value ?? 0} onChange={field.onChange} />
										)}
									/>
								</Field>

								<Field className="md:col-span-2">
									<FieldLabel>{t("fields.notes")}</FieldLabel>
									<Textarea rows={3} {...register("notes")} />
									{errors.notes && <FieldError>{t("validation.invalid")}</FieldError>}
								</Field>
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-semibold">{t("fields.items")}</h3>
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											append({ product_id: "", quantity: 1, purchase_price: 0, discount: 0, notes: null })
										}
										className="cursor-pointer"
									>
										<Plus className="h-4 w-4 mr-2" />
										{t("actions.addItem")}
									</Button>
								</div>

								<div className="rounded-md border divide-y">
									{fields.map((f, idx) => (
										<div key={f.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
											<Field className="md:col-span-5">
												<FieldLabel>{t("fields.product")}</FieldLabel>
												<Controller
													control={control}
													name={`items.${idx}.product_id`}
													render={({ field }) => (
														<Select
															value={field.value ? field.value : NONE_VALUE}
															onValueChange={(v) => field.onChange(v === NONE_VALUE ? "" : v)}
														>
															<SelectTrigger className="cursor-pointer w-full">
																<SelectValue placeholder={t("placeholders.select")} />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value={NONE_VALUE} disabled className="cursor-pointer">
																	{t("placeholders.select")}
																</SelectItem>
																{products.map((p) => (
																	<SelectItem key={p.id} value={p.id} className="cursor-pointer">
																		{p.code ? `${p.code} - ${p.name}` : p.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													)}
												/>
												{errors.items?.[idx]?.product_id && (
													<FieldError>{t("validation.required")}</FieldError>
												)}
											</Field>

											<Field className="md:col-span-2">
												<FieldLabel>{t("fields.quantity")}</FieldLabel>
												<Controller
													control={control}
													name={`items.${idx}.quantity`}
													render={({ field }) => (
														<NumericInput value={field.value ?? 0} onChange={field.onChange} />
													)}
												/>
											</Field>

											<Field className="md:col-span-2">
												<FieldLabel>{t("fields.purchasePrice")}</FieldLabel>
												<Controller
													control={control}
													name={`items.${idx}.purchase_price`}
													render={({ field }) => (
														<NumericInput value={field.value ?? 0} onChange={field.onChange} />
													)}
												/>
											</Field>

											<Field className="md:col-span-2">
												<FieldLabel>{t("fields.discount")}</FieldLabel>
												<Controller
													control={control}
													name={`items.${idx}.discount`}
													render={({ field }) => (
														<NumericInput value={field.value ?? 0} onChange={field.onChange} />
													)}
												/>
											</Field>

											<div className="flex items-end md:col-span-1">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => remove(idx)}
													className="cursor-pointer"
													disabled={fields.length <= 1}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						<aside>
							<div className="md:sticky md:top-4">
								<Card>
									<CardHeader>
										<CardTitle>{t("form.overviewTitle")}</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4 text-sm">
										<div className="space-y-2">
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.requestDate")}</span>
												<span className="text-right font-medium">{overview.requestDate || "-"}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.supplier")}</span>
												<span className="text-right font-medium">{overview.supplierLabel || "-"}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.paymentTerms")}</span>
												<span className="text-right font-medium">{overview.paymentTermsLabel || "-"}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.businessUnit")}</span>
												<span className="text-right font-medium">{overview.businessUnitLabel || "-"}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.employee")}</span>
												<span className="text-right font-medium">{overview.employeeLabel || "-"}</span>
											</div>
										</div>

										<div className="h-px bg-border" />

										<div className="space-y-2">
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.items")}</span>
												<span className="text-right font-medium">{overview.itemsCount}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.subtotal")}</span>
												<span className="text-right font-medium">{formatMoney(overview.subtotal)}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.taxAmount")}</span>
												<span className="text-right font-medium">{formatMoney(overview.taxAmount)}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.deliveryCost")}</span>
												<span className="text-right font-medium">{formatMoney(overview.deliveryCost)}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground">{t("fields.otherCost")}</span>
												<span className="text-right font-medium">{formatMoney(overview.otherCost)}</span>
											</div>
											<div className="flex items-center justify-between gap-3">
												<span className="text-muted-foreground font-semibold">{t("fields.total")}</span>
												<span className="text-right font-semibold">{formatMoney(overview.totalAmount)}</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</aside>
					</div>

					<div className="flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							className="cursor-pointer"
						>
							{t("actions.cancel")}
						</Button>
						<Button type="submit" disabled={isSubmitting || isFetchingDetail} className="cursor-pointer">
							{(isSubmitting || isFetchingDetail) && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							{t("actions.save")}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
