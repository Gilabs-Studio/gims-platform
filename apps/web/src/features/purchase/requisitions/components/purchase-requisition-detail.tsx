"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { usePurchaseRequisition } from "../hooks/use-purchase-requisitions";

function formatMoney(value: number | null | undefined): string {
	const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(safe);
}

interface PurchaseRequisitionDetailProps {
	readonly open: boolean;
	readonly onClose: () => void;
	readonly requisitionId?: string | null;
}

export function PurchaseRequisitionDetail({ open, onClose, requisitionId }: PurchaseRequisitionDetailProps) {
	const t = useTranslations("purchaseRequisition");
	const id = requisitionId ?? "";
	const { data, isLoading, isError } = usePurchaseRequisition(id, {
		enabled: open && !!requisitionId,
	});
	const pr = data?.data;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent size="xl">
				<DialogHeader>
					<DialogTitle>{t("detail.title")}</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-3">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-4 w-72" />
						<Skeleton className="h-48 w-full" />
					</div>
				) : isError || !pr ? (
					<div className="text-sm text-destructive">{t("detail.failed")}</div>
				) : (
					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-mono text-sm font-semibold">{pr.code}</span>
							<Badge variant="outline" className="text-xs font-medium">
								{pr.status}
							</Badge>
							<span className="text-sm text-muted-foreground">
								{t("fields.requestDate")}: {pr.request_date}
							</span>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
							<div>
								<span className="text-muted-foreground">{t("fields.supplier")}: </span>
								<span className="font-medium">{pr.supplier?.name ?? "-"}</span>
							</div>
							<div>
								<span className="text-muted-foreground">{t("fields.paymentTerms")}: </span>
								<span className="font-medium">{pr.payment_terms?.name ?? "-"}</span>
							</div>
							<div>
								<span className="text-muted-foreground">{t("fields.businessUnit")}: </span>
								<span className="font-medium">{pr.business_unit?.name ?? "-"}</span>
							</div>
							<div>
								<span className="text-muted-foreground">{t("fields.requestedBy")}: </span>
								<span className="font-medium">{pr.user?.email ?? "-"}</span>
							</div>
						</div>

						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("fields.product")}</TableHead>
										<TableHead className="text-right">{t("fields.quantity")}</TableHead>
										<TableHead className="text-right">{t("fields.purchasePrice")}</TableHead>
										<TableHead className="text-right">{t("fields.discount")}</TableHead>
										<TableHead className="text-right">{t("fields.subtotal")}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{pr.items?.length ? (
										pr.items.map((it) => (
											<TableRow key={it.id}>
												<TableCell className="font-medium">
													{it.product?.name ?? it.product_id}
												</TableCell>
												<TableCell className="text-right">{it.quantity}</TableCell>
												<TableCell className="text-right">{formatMoney(it.purchase_price)}</TableCell>
												<TableCell className="text-right">{it.discount}%</TableCell>
												<TableCell className="text-right">{formatMoney(it.subtotal)}</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
												{t("emptyItems")}
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
							<div className="text-muted-foreground">{t("fields.subtotal")}</div>
							<div className="text-right font-medium">{formatMoney(pr.subtotal)}</div>
							<div className="text-muted-foreground">{t("fields.taxAmount")}</div>
							<div className="text-right font-medium">{formatMoney(pr.tax_amount)}</div>
							<div className="text-muted-foreground">{t("fields.deliveryCost")}</div>
							<div className="text-right font-medium">{formatMoney(pr.delivery_cost)}</div>
							<div className="text-muted-foreground">{t("fields.otherCost")}</div>
							<div className="text-right font-medium">{formatMoney(pr.other_cost)}</div>
							<div className="text-muted-foreground font-semibold">{t("fields.total")}</div>
							<div className="text-right font-semibold">{formatMoney(pr.total_amount)}</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
