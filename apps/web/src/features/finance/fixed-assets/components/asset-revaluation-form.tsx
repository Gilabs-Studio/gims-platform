"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assetRevaluationSchema, type AssetRevaluationValues } from "../schemas/fixed-assets.schema";
import { useAssetRevaluation } from "../hooks/use-asset-revaluation";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getFinanceErrorMessage } from "@/features/finance/shared/finance-error-utils";
import { useTranslations } from "next-intl";

interface AssetRevaluationFormProps {
  onSuccess?: () => void;
}

export function AssetRevaluationForm({ onSuccess }: AssetRevaluationFormProps) {
  const t = useTranslations("financeFixedAssets.revaluation");
  const { assets, submit } = useAssetRevaluation();
  const canRevalueAsset = useUserPermission("asset.revalue");
  const form = useForm<AssetRevaluationValues>({
    resolver: zodResolver(assetRevaluationSchema),
    defaultValues: {
      asset_id: "",
      new_value: 0,
      revaluation_date: new Date().toISOString().slice(0, 10),
      description: "",
    },
  });

  const onSubmit = async (data: AssetRevaluationValues) => {
    try {
      const submitResult = await submit.mutateAsync({
        assetId: data.asset_id,
        newValue: data.new_value,
        revaluationDate: data.revaluation_date,
        description: data.description,
      });

      if (submitResult.success) {
        toast.success(t("submitForApproval"));
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      toast.error(getFinanceErrorMessage(error, t("submitForApproval")));
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("newAssetRevaluation")}</CardTitle>
        <CardDescription>{t("submitForApproval")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="asset_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("assetLabel")}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue placeholder={t("selectAsset")} />
                      </SelectTrigger>
                      <SelectContent>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id} className="cursor-pointer">
                            {asset.code} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="new_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("newRevaluationAmount")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="revaluation_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("effectiveDateLabel")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("descriptionOptional")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("reasonForRevaluation")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={submit.isPending || !canRevalueAsset} className="w-full">
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {canRevalueAsset ? t("submitButton") : t("submitButton")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
