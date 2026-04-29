/**
 * Schedule management server functions.
 * Cron computes next_run_at and runs due ones.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInput = z.object({
  routeId: z.string().uuid(),
  cadence: z.enum(["once", "hourly", "daily", "weekly", "interval", "price"]),
  intervalMinutes: z.number().int().min(5).max(20160).optional(),
  runAtUtc: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
  weekday: z.number().int().min(0).max(6).optional(),
  thresholdOperator: z.enum(["none", "gte", "lte"]).default("none"),
  thresholdValue: z.number().positive().optional(),
  enabled: z.boolean().default(true),
  startAt: z.string().datetime().optional(),
});

function computeNextRun(input: z.infer<typeof CreateInput>): string | null {
  const now = new Date();
  if (input.cadence === "price") return null; // condition-driven, evaluated each tick
  if (input.cadence === "once") return input.startAt ?? new Date(now.getTime() + 60_000).toISOString();
  if (input.cadence === "hourly") return new Date(now.getTime() + 60 * 60_000).toISOString();
  if (input.cadence === "interval" && input.intervalMinutes) {
    return new Date(now.getTime() + input.intervalMinutes * 60_000).toISOString();
  }
  if (input.cadence === "daily" && input.runAtUtc) {
    const [h, m] = input.runAtUtc.split(":").map(Number);
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }
  if (input.cadence === "weekly" && input.runAtUtc && input.weekday !== undefined) {
    const [h, m] = input.runAtUtc.split(":").map(Number);
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0));
    const diff = (input.weekday - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + diff);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    return next.toISOString();
  }
  return new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
}

export const createSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const next = computeNextRun(data);
    const { data: row, error } = await supabase
      .from("route_schedules")
      .insert({
        user_id: userId,
        route_id: data.routeId,
        enabled: data.enabled,
        cadence: data.cadence,
        interval_minutes: data.intervalMinutes ?? null,
        run_at_utc: data.runAtUtc ?? null,
        weekday: data.weekday ?? null,
        threshold_operator: data.thresholdOperator,
        threshold_value: data.thresholdValue ?? null,
        next_run_at: next,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { schedule: row };
  });

const ToggleInput = z.object({ id: z.string().uuid(), enabled: z.boolean() });
export const toggleSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ToggleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("route_schedules")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("route_schedules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
