import type { ScheduleData } from "../services/googleSheets";
export type RuleCode =
  | "weekday-lunch-11-14";
export interface RuleViolation {
  code: RuleCode;
  day: number;
  message: string;
  details?: Record<string, unknown>;
}
export interface ValidationResult {
  ok: boolean;
  violations: RuleViolation[];
}
export const WEEKDAY_NAMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;
export const LUNCH_WINDOW_HOURS = [11, 12, 13] as const;
function getStatus(schedule: ScheduleData, day: number, hour: number): string | null {
  const dayMap = (schedule as any)[day] as Record<number, string | null> | undefined;
  return dayMap?.[hour] ?? null;
}
export function ruleWeekdayLunch(schedule: ScheduleData): RuleViolation[] {
  const violations: RuleViolation[] = [];
  for (let day = 0; day <= 4; day++) {
    const hasLunch = LUNCH_WINDOW_HOURS.some((h) => getStatus(schedule, day, h) === "almoco");
    const fullClassWindow = LUNCH_WINDOW_HOURS.every((h) => getStatus(schedule, day, h) === "aula");
    if (!hasLunch && !fullClassWindow) {
      violations.push({
        code: "weekday-lunch-11-14",
        day,
        message: `${WEEKDAY_NAMES[day]}: é obrigatório alocar pelo menos 1h de almoço entre 11h e 14h.`,
        details: { window: [11, 14], dayName: WEEKDAY_NAMES[day] },
      });
    }
  }
  return violations;
}
export function validateSchedule(schedule: ScheduleData): ValidationResult {
  const violations: RuleViolation[] = [];
  // Regra de almoço agora é dinâmica (validada no backend via RULES sheet)
  // violations.push(...ruleWeekdayLunch(schedule));
  return { ok: violations.length === 0, violations };
}
export function formatViolations(messages: RuleViolation[]): string[] {
  return messages.map((v) => v.message);
}
export function hasEditorAccess(editor?: number | string): boolean {
  const n = typeof editor === "string" ? Number(editor) : editor;
  return n === 1;
}
