"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createIncidentSchema,
  type CreateIncidentSchemaType,
} from "../schemas/machine.schema";
import { createMachineIncident } from "../services/machine.service";
import { useMachinesStore } from "../stores/use-machines-store";
import { machineKeys } from "./use-machine-list";

export function useMachineIncident(defaultMachineId?: string) {
  const queryClient = useQueryClient();
  const { incidentModalOpen, incidentTargetMachineId, closeIncidentModal } =
    useMachinesStore();

  const targetId = defaultMachineId || incidentTargetMachineId || "";

  const form = useForm<CreateIncidentSchemaType>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      machineId: targetId,
      reason: "",
      category: "Unplanned Breakdown",
      severity: "high",
      durationMinutes: 30,
      startTime: new Date().toISOString().slice(0, 16).replace("T", " "),
      reportedBy: "Operator On Duty",
      actionTaken: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateIncidentSchemaType) => createMachineIncident(data),
    onSuccess: (newIncident) => {
      queryClient.invalidateQueries({ queryKey: machineKeys.all });
      toast.success(`Gangguan berhasil dicatat: ${newIncident.reason}`);
      form.reset();
      closeIncidentModal();
    },
    onError: () => {
      toast.error("Gagal mencatat kejadian gangguan mesin");
    },
  });

  const onSubmit = form.handleSubmit((values: CreateIncidentSchemaType) => {
    mutation.mutate(values);
  });

  return {
    form,
    onSubmit,
    isSubmitting: mutation.isPending,
    isOpen: incidentModalOpen,
    closeModal: () => {
      form.reset();
      closeIncidentModal();
    },
    targetMachineId: targetId,
  };
}
