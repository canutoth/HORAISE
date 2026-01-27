/**
 * Validações dinâmicas baseadas nas regras da aba "RULES"
 */

export interface DynamicRulesConfig {
  minimoSlotsConsecutivos: number;
  minimoSlotsDiariosPresencial: number;
  intervaloAlmoco: string; // formato "11-14"
}

export interface DynamicValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Converte scheduleRow (91 posições) em estrutura por dia e hora
 * 7 dias x 13 horas = 91 posições
 * Cada dia tem 13 slots (8h-20h)
 */
function parseScheduleByDay(scheduleRow: string[]): Map<number, string[]> {
  const dayMap = new Map<number, string[]>();
  
  for (let day = 0; day < 7; day++) {
    const daySlots: string[] = [];
    for (let hour = 0; hour < 13; hour++) {
      const index = day * 13 + hour;
      const value = (scheduleRow[index] || "").toUpperCase();
      daySlots.push(value);
    }
    dayMap.set(day, daySlots);
  }
  
  return dayMap;
}

/**
 * Verifica se um slot é considerado "trabalho" (P, O, R)
 */
function isWorkSlot(value: string): boolean {
  return value === "P" || value === "O" || value === "R";
}

/**
 * Verifica se um slot é presencial (P)
 */
function isPresencialSlot(value: string): boolean {
  return value === "P";
}

/**
 * Valida a regra de mínimo de slots consecutivos
 * Se a pessoa trabalha (P, O ou R), TODOS os grupos de trabalho precisam ter pelo menos X slots seguidos
 */
export function validateConsecutiveSlots(
  scheduleRow: string[],
  minimoSlots: number
): DynamicValidationResult {
  const errors: string[] = [];
  const dayMap = parseScheduleByDay(scheduleRow);
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  
  dayMap.forEach((slots, day) => {
    const streaks: number[] = []; // Armazena todos os grupos de trabalho consecutivos
    let currentStreak = 0;
    
    for (const slot of slots) {
      if (isWorkSlot(slot)) {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streaks.push(currentStreak);
          currentStreak = 0;
        }
      }
    }
    
    // Adiciona o último grupo se terminou trabalhando
    if (currentStreak > 0) {
      streaks.push(currentStreak);
    }
    
    // Verifica se ALGUM grupo tem menos que o mínimo
    const violatingStreaks = streaks.filter(s => s < minimoSlots);
    if (violatingStreaks.length > 0) {
      const minFound = Math.min(...streaks);
      errors.push(
        `${dayNames[day]}: Você tem grupo(s) de trabalho com menos de ${minimoSlots} slots consecutivos. Menor grupo encontrado: ${minFound} slot(s).`
      );
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida a regra de mínimo de slots diários presenciais
 * Se a pessoa tem slots presenciais em um dia, precisa ter pelo menos X slots presenciais naquele dia
 */
export function validateDailyPresencialSlots(
  scheduleRow: string[],
  minimoSlots: number
): DynamicValidationResult {
  const errors: string[] = [];
  const dayMap = parseScheduleByDay(scheduleRow);
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  
  dayMap.forEach((slots, day) => {
    const presencialCount = slots.filter(isPresencialSlot).length;
    
    // Se tem pelo menos 1 slot presencial mas não atingiu o mínimo
    if (presencialCount > 0 && presencialCount < minimoSlots) {
      errors.push(
        `${dayNames[day]}: Você tem ${presencialCount} slot(s) presencial(is), mas o mínimo é ${minimoSlots} slots presenciais.`
      );
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida a regra de intervalo de almoço
 * Só cobra almoço se a pessoa estiver trabalhando antes E depois do intervalo
 */
export function validateLunchInterval(
  scheduleRow: string[],
  intervaloAlmoco: string
): DynamicValidationResult {
  const errors: string[] = [];
  const dayMap = parseScheduleByDay(scheduleRow);
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  
  // Parse do intervalo (ex: "11-14" -> início: 11, fim: 14)
  const [startStr, endStr] = intervaloAlmoco.split("-");
  const lunchStart = parseInt(startStr, 10);
  const lunchEnd = parseInt(endStr, 10);
  
  if (isNaN(lunchStart) || isNaN(lunchEnd)) {
    console.warn("Formato de intervalo de almoço inválido:", intervaloAlmoco);
    return { isValid: true, errors: [] }; // Ignora validação se formato inválido
  }
  
  // Para horários de 8h-20h (13 slots), mapeamos:
  // 8h = index 0, 9h = index 1, ..., 20h = index 12
  const baseHour = 8;
  
  dayMap.forEach((slots, day) => {
    // Ignora fins de semana (sábado=5, domingo=6) - ajustar se necessário
    if (day >= 5) return;
    
    // Verifica se tem trabalho antes do intervalo
    let hasWorkBefore = false;
    for (let h = lunchStart - baseHour - 1; h >= 0; h--) {
      if (isWorkSlot(slots[h])) {
        hasWorkBefore = true;
        break;
      }
    }
    
    // Verifica se tem trabalho depois do intervalo
    let hasWorkAfter = false;
    for (let h = lunchEnd - baseHour; h < slots.length; h++) {
      if (isWorkSlot(slots[h])) {
        hasWorkAfter = true;
        break;
      }
    }
    
    // Se tem trabalho antes E depois, mas não tem almoço no intervalo
    if (hasWorkBefore && hasWorkAfter) {
      let hasLunch = false;
      for (let h = lunchStart - baseHour; h < lunchEnd - baseHour; h++) {
        if (h >= 0 && h < slots.length) {
          if (slots[h] === "L") { // L = Almoço
            hasLunch = true;
            break;
          }
        }
      }
      
      if (!hasLunch) {
        errors.push(
          `${dayNames[day]}: Você está trabalhando antes e depois do intervalo ${intervaloAlmoco}h. É obrigatório alocar pelo menos 1h de almoço nesse período.`
        );
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida todas as regras dinâmicas
 */
export function validateDynamicRules(
  scheduleRow: string[],
  rules: DynamicRulesConfig
): DynamicValidationResult {
  const allErrors: string[] = [];
  
  // Valida slots consecutivos
  const consecutiveResult = validateConsecutiveSlots(scheduleRow, rules.minimoSlotsConsecutivos);
  allErrors.push(...consecutiveResult.errors);
  
  // Valida slots presenciais diários
  const dailyPresencialResult = validateDailyPresencialSlots(
    scheduleRow,
    rules.minimoSlotsDiariosPresencial
  );
  allErrors.push(...dailyPresencialResult.errors);
  
  // Valida intervalo de almoço
  const lunchResult = validateLunchInterval(scheduleRow, rules.intervaloAlmoco);
  allErrors.push(...lunchResult.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
