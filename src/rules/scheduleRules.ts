// Centralized schedule validation rules for HORAISE
// Future: add more rules here and compose them in validateSchedule

import type { ScheduleData } from "../services/googleSheets";

export type RuleCode =
  | "weekday-lunch-11-14";

export interface RuleViolation {
  code: RuleCode;
  day: number; // 0=Seg, 1=Ter, ... 6=Dom (matches Schedule UI)
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  violations: RuleViolation[];
}

// IMPORTANT: Match the UI indexing (Schedule component):
// day 0 = Segunda, 1 = Terça, 2 = Quarta, 3 = Quinta, 4 = Sexta, 5 = Sábado, 6 = Domingo
export const WEEKDAY_NAMES = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

// Window [11h, 14h) -> hours 11,12,13 in the grid (each is a 1h slot)
export const LUNCH_WINDOW_HOURS = [11, 12, 13] as const;

// Helper: safely read a status value
function getStatus(schedule: ScheduleData, day: number, hour: number): string | null {
  const dayMap = (schedule as any)[day] as Record<number, string | null> | undefined;
  return dayMap?.[hour] ?? null;
}

// Rule: On weekdays (Seg-Sex), allocate at least one "almoss" slot between 11h and 14h,
// except if the person has "aula" during the entire interval (11h, 12h, 13h).
export function ruleWeekdayLunch(schedule: ScheduleData): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Days 0..4 => Segunda..Sexta (UI is Monday-first)
  for (let day = 0; day <= 4; day++) {
    const hasLunch = LUNCH_WINDOW_HOURS.some((h) => getStatus(schedule, day, h) === "almoss");
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

// Aggregate validator to run all rules (expand here as new rules are added)
export function validateSchedule(schedule: ScheduleData): ValidationResult {
  const violations: RuleViolation[] = [];

  // Apply rules
  violations.push(...ruleWeekdayLunch(schedule));

  return { ok: violations.length === 0, violations };
}

// Optional: utility to format violations for UI or toasts
export function formatViolations(messages: RuleViolation[]): string[] {
  return messages.map((v) => v.message);
}

// Access control helper for editor flag
export function hasEditorAccess(editor?: number | string): boolean {
  const n = typeof editor === "string" ? Number(editor) : editor;
  return n === 1;
}
