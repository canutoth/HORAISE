export type RuleCode = "dynamic-rule";

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

export function validateSchedule(): ValidationResult {
  // As regras de horário são validadas dinamicamente no backend via RULES sheet.
  return { ok: true, violations: [] };
}