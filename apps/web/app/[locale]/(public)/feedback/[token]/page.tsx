import { getTranslations } from "next-intl/server";
import { CircleCheckBig, CircleX } from "lucide-react";
import { feedbackService } from "@/features/pos/feedback/services/feedback-service";
import { PublicFeedbackForm } from "@/features/pos/feedback/components/public-feedback-form";
import type { FormSchema } from "@/features/pos/feedback/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

type FeedbackPageState =
  | { type: "expired" }
  | { type: "used" }
  | { type: "invalid" }
  | { type: "error" }
  | {
      type: "form";
      form: {
        title: string;
        description?: string;
        schema_json: FormSchema;
      };
      customerName: string | undefined;
    };

type PublicFormPayload = {
  title?: string;
  description?: string | null;
  schema_json?: FormSchema;
  customer_name?: string | null;
  status?: string;
  form?: {
    title?: string;
    description?: string | null;
    schema_json?: FormSchema;
  };
};

async function resolveFeedbackState(token: string): Promise<FeedbackPageState> {
  try {
    const result = await feedbackService.getPublicForm(token);

    if (!result.success) {
      const code = (result as { error?: { code?: string } }).error?.code;
      if (code === "FEEDBACK_TOKEN_EXPIRED") return { type: "expired" };
      if (code === "FEEDBACK_TOKEN_USED") return { type: "used" };
      if (code === "FEEDBACK_TOKEN_NOT_FOUND") return { type: "invalid" };
      return { type: "error" };
    }

    const payload = result.data as PublicFormPayload;
    const status = payload.status;
    if (status === "used") return { type: "used" };
    if (status === "expired") return { type: "expired" };

    // Support both response shapes:
    // 1) current backend: { title, description, schema_json, customer_name }
    // 2) legacy format:   { form: { title, description, schema_json }, customer_name }
    const formTitle = payload.title ?? payload.form?.title;
    const formDescription = payload.description ?? payload.form?.description;
    const formSchema = payload.schema_json ?? payload.form?.schema_json;

    if (!formTitle || !formSchema) {
      return { type: "error" };
    }

    return {
      type: "form",
      form: {
        title: formTitle,
        description: formDescription ?? undefined,
        schema_json: formSchema,
      },
      customerName: payload.customer_name ?? undefined,
    };
  } catch {
    return { type: "error" };
  }
}

export default async function PublicFeedbackPage({ params }: PageProps) {
  const { token } = await params;
  const t = await getTranslations("feedback.public");

  const state = await resolveFeedbackState(token);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {state.type === "expired" && (
            <ErrorState message={t("expired")} />
          )}
          {state.type === "used" && (
            <ErrorState icon="check" message={t("used")} />
          )}
          {state.type === "invalid" && (
            <ErrorState message={t("invalid")} />
          )}
          {state.type === "error" && (
            <ErrorState message={t("error")} />
          )}
          {state.type === "form" && (
            <>
              <PublicFeedbackForm
                token={token}
                title={state.form.title}
                description={state.form.description}
                greeting={
                  state.customerName
                    ? t("greeting", { name: state.customerName })
                    : undefined
                }
                schema={state.form.schema_json}
                customerName={state.customerName}
              />
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("poweredBy")}
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  icon = "x",
}: {
  message: string;
  icon?: "x" | "check";
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div
        className={`rounded-full p-3 ${
          icon === "check"
            ? "bg-success/10 text-success"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        {icon === "check" ? (
          <CircleCheckBig className="h-8 w-8" />
        ) : (
          <CircleX className="h-8 w-8" />
        )}
      </div>
      <p className="text-base font-medium pt-6">{message}</p>
    </div>
  );
}