"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assetRevaluationSchema, type AssetRevaluationValues } from "../schemas/fixed-assets.schema";
import { useAssetRevaluation } from "../hooks/use-asset-revaluation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AssetRevaluationFormProps {
  onSuccess?: () => void;
}

export function AssetRevaluationForm({ onSuccess }: AssetRevaluationFormProps) {
  const { preview, approve } = useAssetRevaluation();
  const form = useForm<AssetRevaluationValues>({
    resolver: zodResolver(assetRevaluationSchema),
  });

  const onSubmit = async (data: AssetRevaluationValues) => {
    try {
      const previewResult = await preview.mutateAsync({
        assetId: data.asset_id,
        revaluationAmount: data.revaluation_amount,
      });

      if (previewResult.success) {
        toast.success("Revaluation preview generated");
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      toast.error("Failed to process revaluation");
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Asset Revaluation</CardTitle>
        <CardDescription>Submit asset revaluation for approval</CardDescription>
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
              name="revaluation_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Revaluation Amount</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="delta_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revaluation Delta</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" disabled />
                  </FormControl>
                  <FormDescription>Automatically calculated (new amount - old amount)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effective_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date</FormLabel>
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
                    <Input {...field} placeholder="Reason for revaluation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={preview.isPending} className="w-full">
              {preview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Approval
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
