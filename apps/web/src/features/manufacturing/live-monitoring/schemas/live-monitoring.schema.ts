import { z } from "zod";

export const liveMonitoringFilterSchema = z.object({
  lineId: z.string().default("all"),
  timeWindow: z.enum(["15m", "30m", "1h", "shift", "today"]).default("30m"),
  autoRefresh: z.boolean().default(true),
});

export type LiveMonitoringFilterValues = z.infer<typeof liveMonitoringFilterSchema>;
