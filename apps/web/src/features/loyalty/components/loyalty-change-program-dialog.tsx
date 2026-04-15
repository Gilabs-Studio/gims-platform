"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";

import { useChangeMemberProgram, useLoyaltyPrograms } from "../hooks/use-loyalty";
import type { LoyaltyMember } from "../types";

interface LoyaltyChangeProgramDialogProps {
  member: LoyaltyMember | null;
  onClose: () => void;
}

export function LoyaltyChangeProgramDialog({ member, onClose }: LoyaltyChangeProgramDialogProps) {
  const t = useTranslations("loyalty");
  const tCommon = useTranslations("common");

  const [programId, setProgramId] = useState<string>(() => member?.program_id ?? "");

  const { data: programsData, isLoading: programsLoading } = useLoyaltyPrograms({ per_page: 100 });
  const programs = useMemo(() => programsData?.data ?? [], [programsData]);

  const changeMutation = useChangeMemberProgram();

  async function handleSave() {
    if (!member || !programId) return;
    if (programId === member.program_id) {
      onClose();
      return;
    }

    try {
      await changeMutation.mutateAsync({
        memberId: member.id,
        programId: programId,
      });
      toast.success(t("members.changeProgramSuccess"));
      onClose();
    } catch {
      toast.error(t("members.changeProgramError"));
    }
  }

  const isPending = changeMutation.isPending;

  return (
    <Dialog key={member?.id ?? "loyalty-change-dialog"} open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("members.changeProgram")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">{tCommon("name")}:</span>
            <span className="font-medium">{member?.customer_name}</span>
          </div>

          <Field>
            <FieldLabel>{t("programs.title")}</FieldLabel>
            <Select value={programId} onValueChange={setProgramId} disabled={programsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={tCommon("select")} />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tCommon("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isPending || programId === member?.program_id}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon("actions.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
