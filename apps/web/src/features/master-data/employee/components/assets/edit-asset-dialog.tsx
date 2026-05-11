"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import type {
	AssetCondition,
	AvailableAsset,
	EmployeeAsset,
} from "../../types";
import {
	useAvailableAssets,
	useUpdateEmployeeAsset,
} from "../../hooks/use-employees";

const CONDITION_OPTIONS: AssetCondition[] = [
	"NEW",
	"GOOD",
	"FAIR",
	"POOR",
	"DAMAGED",
];

interface EditAssetDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	readonly employeeId: string;
	readonly asset: EmployeeAsset | null;
	readonly onSuccess?: () => void;
}

export function EditAssetDialog({
	open,
	onOpenChange,
	employeeId,
	asset,
	onSuccess,
}: EditAssetDialogProps) {
	const t = useTranslations("employee");
	const updateMutation = useUpdateEmployeeAsset();
	const { data: availableAssets, isLoading: isLoadingAssets } =
		useAvailableAssets({
			enabled: open,
		});

	const [selectedAssetId, setSelectedAssetId] = useState("");
	const [borrowDate, setBorrowDate] = useState<Date | undefined>();
	const [borrowCondition, setBorrowCondition] = useState<string>("");
	const [assetImage, setAssetImage] = useState("");
	const [notes, setNotes] = useState("");

	const assetOptions = useMemo<AvailableAsset[]>(() => {
		const options = [...(availableAssets ?? [])];

		if (!asset?.asset_id) {
			return options;
		}

		const currentLinkedAsset: AvailableAsset = asset.asset ?? {
			id: asset.asset_id,
			code: asset.asset_code,
			name: asset.asset_name,
			category: asset.asset_category
				? {
						id: `asset-category-${asset.asset_id}`,
						name: asset.asset_category,
					}
				: undefined,
			asset_image: asset.asset_image,
			status: "in_use",
			book_value: 0,
		};

		if (!options.some((item) => item.id === currentLinkedAsset.id)) {
			options.unshift(currentLinkedAsset);
		}

		return options;
	}, [availableAssets, asset]);

	const selectedAsset = useMemo(
		() => assetOptions.find((item) => item.id === selectedAssetId),
		[assetOptions, selectedAssetId],
	);

	const resetForm = useCallback(() => {
		setSelectedAssetId(asset?.asset_id ?? "");
		setBorrowDate(asset?.borrow_date ? new Date(asset.borrow_date) : undefined);
		setBorrowCondition(asset?.borrow_condition ?? "");
		setAssetImage(asset?.asset_image ?? "");
		setNotes(asset?.notes ?? "");
	}, [asset]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const timer = window.setTimeout(() => {
			resetForm();
		}, 0);

		return () => window.clearTimeout(timer);
  }, [open, asset, resetForm]);

	const handleDialogChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			resetForm();
		}
		onOpenChange(nextOpen);
	};

	const handleSubmit = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (!asset) return;
		if (!selectedAsset || !borrowDate || !borrowCondition) {
			toast.error("Please fill all required fields");
			return;
		}

		const payload = {
			asset_id: selectedAsset.id,
			asset_name: selectedAsset.name,
			asset_code: selectedAsset.code,
			asset_category: selectedAsset.category?.name || "Uncategorized",
			borrow_date: format(borrowDate, "yyyy-MM-dd"),
			borrow_condition: borrowCondition as AssetCondition,
			asset_image: assetImage || null,
			notes: notes || undefined,
		};

		try {
			await updateMutation.mutateAsync({
				employeeId,
				assetId: asset.id,
				data: payload,
			});
			toast.success(t("asset.success.updated"));
			handleDialogChange(false);
			onSuccess?.();
		} catch {
			toast.error(t("asset.error.updateFailed"));
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t("asset.form.editTitle")}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>{t("asset.fields.selectAsset")} *</Label>
						<Select
							value={selectedAssetId}
							onValueChange={setSelectedAssetId}
							disabled={isLoadingAssets}
						>
							<SelectTrigger className="cursor-pointer">
								<SelectValue
									placeholder={
										isLoadingAssets
											? t("asset.form.loadingAssets")
											: t("asset.form.selectAssetPlaceholder")
									}
								/>
							</SelectTrigger>
							<SelectContent className="max-h-[300px]">
								{assetOptions.map((option) => (
									<SelectItem
										key={option.id}
										value={option.id}
										className="cursor-pointer"
									>
										<div className="flex items-center gap-2">
											<Package className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">{option.name}</span>
											<span className="text-muted-foreground">
												({option.code})
											</span>
											{option.category && (
												<span className="text-xs text-muted-foreground ml-1">
													- {option.category.name}
												</span>
											)}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selectedAsset && (
						<div className="rounded-lg border bg-muted/50 p-3 space-y-2">
							<div className="flex items-center gap-2">
								<Package className="h-4 w-4 text-primary" />
								<span className="font-medium">{selectedAsset.name}</span>
							</div>
							<div className="text-sm text-muted-foreground space-y-1">
								<p>
									{t("asset.fields.assetCode")}: {selectedAsset.code}
								</p>
								{selectedAsset.category && (
									<p>
										{t("asset.fields.assetCategory")}:{" "}
										{selectedAsset.category.name}
									</p>
								)}
								{selectedAsset.location && (
									<p>
										{t("asset.fields.location")}: {selectedAsset.location.name}
									</p>
								)}
								{selectedAsset.asset_image && !assetImage && (
									<p className="text-xs text-green-600">
										{t("asset.form.hasDefaultImage")}
									</p>
								)}
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>{t("asset.fields.borrowDate")} *</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										type="button"
										variant="outline"
										className={cn(
											"w-full justify-start text-left font-normal cursor-pointer",
											!borrowDate && "text-muted-foreground",
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4" />
										{borrowDate
											? format(borrowDate, "PPP")
											: t("asset.form.selectDate")}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={borrowDate}
										onSelect={setBorrowDate}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>

						<div className="space-y-2">
							<Label>{t("asset.fields.borrowCondition")} *</Label>
							<Select
								value={borrowCondition}
								onValueChange={setBorrowCondition}
							>
								<SelectTrigger className="cursor-pointer">
									<SelectValue placeholder={t("asset.form.selectCondition")} />
								</SelectTrigger>
								<SelectContent>
									{CONDITION_OPTIONS.map((condition) => (
										<SelectItem
											key={condition}
											value={condition}
											className="cursor-pointer"
										>
											{t(
												`asset.conditions.${condition}` as Parameters<
													typeof t
												>[0],
											)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label>{t("asset.fields.assetImage")}</Label>
						<FileUpload
							value={assetImage}
							onChange={(url) => setAssetImage(url ?? "")}
							accept=".jpg,.jpeg,.png,.webp"
							uploadEndpoint="/upload/image"
						/>
						<p className="text-xs text-muted-foreground">
							{t("asset.form.imageHint")}
						</p>
					</div>

					<div className="space-y-2">
						<Label>{t("asset.fields.notes")}</Label>
						<Textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder={t("asset.form.notesPlaceholder")}
							rows={3}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => handleDialogChange(false)}
						className="cursor-pointer"
					>
						{t("actions.cancel")}
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={updateMutation.isPending}
						className="cursor-pointer"
					>
						{updateMutation.isPending ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : null}
						{updateMutation.isPending
							? t("asset.actions.processing")
							: t("asset.actions.edit")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
