import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateMovement } from "./use-movements";
import { stockMovementSchema, StockMovementFormData } from "../schemas/movement.schema";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function useStockMovementForm() {
  const router = useRouter();
  const t = useTranslations("stock_movement");
  const { mutateAsync: createMovement, isPending } = useCreateMovement();

  const form = useForm<StockMovementFormData>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      type: "TRANSFER",
      quantity: 1,
      reference_number: "",
      description: "",
    },
  });

  const onSubmit = async (data: StockMovementFormData) => {
    try {
      await createMovement(data);
      toast.success(t("form.createSuccess"));
      router.push("/stock/movements");
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const message = apiError?.response?.data?.message;

      if (message?.includes("insufficient stock")) {
        toast.error(t("form.insufficientStock"));
      } else if (message?.includes("target warehouse")) {
        toast.error(t("form.targetRequired"));
      } else {
        toast.error(message ?? t("form.createError"));
      }
    }
  };

  return { form, onSubmit, isPending };
}
