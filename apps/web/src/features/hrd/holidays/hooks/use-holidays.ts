"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { holidayService } from "../services/holiday-service";
import type { 
  CreateHolidayRequest, 
  UpdateHolidayRequest 
} from "../types";

const QUERY_KEYS = {
  holidays: (params?: unknown) => ["holidays", params],
  holiday: (id: string) => ["holidays", id],
  holidaysByYear: (year: number) => ["holidays", "year", year],
  calendar: (year: number) => ["holidays", "calendar", year],
  checkDate: (date: string) => ["holidays", "check", date],
} as const;

export function useHolidays(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  year?: number;
  type?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.holidays(params),
    queryFn: () => holidayService.list(params),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useHoliday(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.holiday(id),
    queryFn: () => holidayService.getById(id),
    enabled: !!id,
  });
}

export function useHolidaysByYear(year: number) {
  return useQuery({
    queryKey: QUERY_KEYS.holidaysByYear(year),
    queryFn: () => holidayService.getByYear(year),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: year > 0,
  });
}

export function useHolidayCalendar(year: number) {
  return useQuery({
    queryKey: QUERY_KEYS.calendar(year),
    queryFn: () => holidayService.getCalendar(year),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: year > 0,
  });
}

export function useCheckHoliday(date: string) {
  return useQuery({
    queryKey: QUERY_KEYS.checkDate(date),
    queryFn: () => holidayService.checkDate(date),
    enabled: !!date,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayRequest) => holidayService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useCreateBatchHolidays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (holidays: CreateHolidayRequest[]) => 
      holidayService.createBatch(holidays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useImportHolidaysCSV() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, year }: { file: File; year: number }) =>
      holidayService.importCSV(file, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayRequest }) =>
      holidayService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.holiday(variables.id) 
      });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => holidayService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}
