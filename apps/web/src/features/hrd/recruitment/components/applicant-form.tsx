"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Label } from "@/components/ui/label";
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
import { useApplicantStages, useCreateApplicant, useUpdateApplicant } from "../hooks/use-applicants";
import type { RecruitmentApplicant, ApplicantSource } from "../types";

function useApplicantSources(t: (key: string) => string): { value: ApplicantSource; label: string }[] {
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
    email: z.string().min(1, t("validation.required")).email(t("validation.invalidEmail")),
    phone: z.string().optional(),
    source: z.enum(["linkedin", "jobstreet", "glints", "referral", "direct", "other"]),
    stage_id: z.string().min(1, t("validation.required")),
    notes: z.string().optional(),
    resume_url: z.string().optional().or(z.literal("")),
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

  const stages = stagesData?.data || [];
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
          },
        });
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
        });
      }
      onClose();
    } catch (error) {
      // Error is handled by the mutation
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("applicants.fields.fullName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("applicants.placeholders.fullName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("applicants.fields.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("applicants.placeholders.email")}
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("applicants.fields.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("applicants.placeholders.phone")}
                        {...field}
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, '');
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
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
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
