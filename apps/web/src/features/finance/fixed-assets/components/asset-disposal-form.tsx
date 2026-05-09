"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assetDisposalSchema, type AssetDisposalValues } from "../schemas/fixed-assets.schema";
import { useAssetDisposal } from "../hooks/use-asset-disposal";
import { useUserPermission } from "@/hooks/use-user-permission";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getFinanceErrorMessage } from "@/features/finance/shared/finance-error-utils";

interface AssetDisposalFormProps {
  onSuccess?: () => void;
}

export function AssetDisposalForm({ onSuccess }: AssetDisposalFormProps) {
  const { preview, confirm } = useAssetDisposal();
  const canDisposeAsset = useUserPermission("asset.dispose");
  const form = useForm<AssetDisposalValues>({
    resolver: zodResolver(assetDisposalSchema),
  });

  const onSubmit = async (data: AssetDisposalValues) => {
    try {
      const previewResult = await preview.mutateAsync({
        assetId: data.asset_id,
        proceedsAmount: data.proceeds_amount,
        disposalAccountId: data.disposal_account_id,
      });

      if (previewResult.success) {
        const confirmResult = await confirm.mutateAsync({
          assetId: data.asset_id,
          data: {
            asset_id: data.asset_id,
            proceeds_amount: data.proceeds_amount,
            disposal_account_id: data.disposal_account_id,
            bank_account_id: data.bank_account_id,
            disposal_date: data.disposal_date,
            description: data.description,
          },
        });

        if (confirmResult.success) {
          toast.success("Asset disposed successfully");
          form.reset();
          onSuccess?.();
        }
      }
    } catch (error) {
      toast.error(getFinanceErrorMessage(error, "Failed to dispose asset"));
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Asset Disposal</CardTitle>
        <CardDescription>Enter asset disposal details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="asset_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Select asset" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proceeds_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proceeds Amount</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Select bank account" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disposal_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disposal Date</FormLabel>
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Additional notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={confirm.isPending || !canDisposeAsset} className="w-full">
              {confirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {canDisposeAsset ? "Dispose Asset" : "No permission to dispose"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
