"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import {
  useApplicantStages,
  useCreateApplicant,
  useUpdateApplicant,
} from "../hooks/use-applicants";
import type { RecruitmentApplicant, ApplicantSource } from "../types";

function useApplicantSources(
  t: (key: string) => string,
): { value: ApplicantSource; label: string }[] {
  return [
    { value: "linkedin", label: t("applicants.sources.linkedin") },
    { value: "jobstreet", label: t("applicants.sources.jobstreet") },
    { value: "glints", label: t("applicants.sources.glints") },
    { value: "referral", label: t("applicants.sources.referral") },
    { value: "direct", label: t("applicants.sources.direct") },
    { value: "other", label: t("applicants.sources.other") },
  ];
}

function getFormSchema(t: (key: string) => string) {
  return z.object({
    full_name: z.string().min(1, t("validation.required")),
    email: z
      .string()
      .min(1, t("validation.required"))
      .email(t("validation.invalidEmail")),
    phone: z.string().optional(),
    source: z.enum([
      "linkedin",
      "jobstreet",
      "glints",
      "referral",
      "direct",
      "other",
    ]),
    stage_id: z.string().min(1, t("validation.required")),
    notes: z.string().optional(),
    resume_url: z.string().optional().or(z.literal("")),
    linkedin_url: z.string().optional().or(z.literal("")),
  });
}

type FormData = z.infer<ReturnType<typeof getFormSchema>>;

interface ApplicantFormProps {
  open: boolean;
  onClose: () => void;
  recruitmentRequestId: string;
  applicant?: RecruitmentApplicant | null;
  defaultStageId?: string;
}

export function ApplicantForm({
  open,
  onClose,
  recruitmentRequestId,
  applicant,
  defaultStageId,
}: ApplicantFormProps) {
  const t = useTranslations("recruitment");
  const { data: stagesData } = useApplicantStages();
  const createMutation = useCreateApplicant();
  const updateMutation = useUpdateApplicant();

  const stages = useMemo(() => stagesData?.data || [], [stagesData?.data]);
  const isEditing = !!applicant;
  const applicantSources = useApplicantSources(t);

  const formSchema = getFormSchema(t);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      source: "direct",
      stage_id: defaultStageId || "",
      notes: "",
      resume_url: "",
      linkedin_url: "",
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (applicant) {
        form.reset({
          full_name: applicant.full_name,
          email: applicant.email,
          phone: applicant.phone || "",
          source: applicant.source,
          stage_id: applicant.stage_id,
          notes: applicant.notes || "",
          resume_url: applicant.resume_url || "",
          linkedin_url: applicant.linkedin_url || "",
        });
      } else {
        form.reset({
          full_name: "",
          email: "",
          phone: "",
          source: "direct",
          stage_id: defaultStageId || stages[0]?.id || "",
          notes: "",
          resume_url: "",
          linkedin_url: "",
        });
      }
    }
  }, [open, applicant, defaultStageId, stages, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && applicant) {
        await updateMutation.mutateAsync({
          id: applicant.id,
          data: {
            full_name: data.full_name,
            email: data.email,
            phone: data.phone || undefined,
            source: data.source,
            notes: data.notes || undefined,
            resume_url: data.resume_url || undefined,
            linkedin_url: data.linkedin_url || undefined,
          },
        });
        toast.success(t("applicants.updated"));
      } else {
        await createMutation.mutateAsync({
          recruitment_request_id: recruitmentRequestId,
          stage_id: data.stage_id,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || undefined,
          source: data.source,
          notes: data.notes || undefined,
          resume_url: data.resume_url || undefined,
          linkedin_url: data.linkedin_url || undefined,
        });
        toast.success(t("applicants.created"));
      }
      onClose();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.details?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        "Gagal menyimpan data pelamar";

      if (errorMsg.includes("INVALID_LINKEDIN_URL") || errorMsg.includes("LinkedIn")) {
        form.setError("linkedin_url", {
          type: "manual",
          message: "Masukkan URL LinkedIn yang valid (contoh: linkedin.com/in/username)",
        });
        toast.error("Format URL LinkedIn tidak valid");
      } else if (errorMsg.includes("RECRUITMENT_NOT_OPEN") || errorMsg.includes("open recruitment requests")) {
        toast.error("Pelamar hanya dapat ditambahkan ketika status lowongan 'OPEN'");
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("applicants.edit") : t("applicants.add")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("applicants.editDescription")
              : t("applicants.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t("applicants.fields.fullName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("applicants.placeholders.fullName")}
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t("applicants.fields.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("applicants.placeholders.email")}
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t("applicants.fields.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("applicants.placeholders.phone")}
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("applicants.fields.source")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {applicantSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("applicants.fields.stage")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="resume_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("applicants.fields.resume")}</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={(url) => field.onChange(url || "")}
                      placeholder={t("applicants.placeholders.resume")}
                      accept=".pdf,.doc,.docx"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedin_url"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t("applicants.fields.linkedin")}</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={t("applicants.placeholders.linkedin")}
                      className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("applicants.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("applicants.placeholders.notes")}
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t("common.saving")
                  : isEditing
                    ? t("common.update")
                    : t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
