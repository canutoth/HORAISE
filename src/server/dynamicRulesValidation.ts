/**
 * Validações dinâmicas baseadas nas regras da aba "RULES"
 */

export interface DynamicRulesConfig {
  minimoSlotsConsecutivos: number;
  minimoSlotsDiariosPresencial: number;
  intervaloAlmoco: string; // formato "11-14"
  inicio: number; // hora de início do expediente (ex: 8)
  fim: number; // hora de fim do expediente (ex: 18)
}

export interface DynamicValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Converte scheduleRow (91 posições) em estrutura por dia e hora
 * 7 dias x 13 horas = 91 posições
 * Cada dia tem 13 slots (7h-20h: 7-8h, 8-9h, ..., 19-20h)
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
  
  // Para horários de 7h-20h (13 slots), mapeamos:
  // 7h = index 0, 8h = index 1, ..., 19h = index 12
  const baseHour = 7;
  
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
 * Valida se há preenchimentos fora do range de horário permitido (inicio-fim)
 * A aba INFO sempre tem 7-20h, mas se a pessoa preencher fora do range inicio-fim de RULES,
 * ela é sinalizada para poder solicitar exceção
 */
export function validateWorkingHoursRange(
  scheduleRow: string[],
  inicio: number,
  fim: number
): DynamicValidationResult {
  const errors: string[] = [];
  const dayMap = parseScheduleByDay(scheduleRow);
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  
  // Para horários de 7h-20h (13 slots), mapeamos:
  // 7h = index 0, 8h = index 1, ..., 19h = index 12
  const baseHour = 7;
  
  dayMap.forEach((slots, day) => {
    const violatingHours: number[] = [];
    
    slots.forEach((slot, hourIndex) => {
      // Se há algum preenchimento (qualquer valor não vazio)
      if (slot && slot.trim() !== "") {
        const actualHour = baseHour + hourIndex;
        
        // Verifica se está fora do range permitido
        if (actualHour < inicio || actualHour >= fim) {
          violatingHours.push(actualHour);
        }
      }
    });
    
    if (violatingHours.length > 0) {
      // Agrupa horários consecutivos para mostrar ranges
      const ranges: string[] = [];
      let rangeStart = violatingHours[0];
      let rangeEnd = violatingHours[0];
      
      for (let i = 1; i < violatingHours.length; i++) {
        if (violatingHours[i] === rangeEnd + 1) {
          // Horário consecutivo, expande o range
          rangeEnd = violatingHours[i];
        } else {
          // Quebra na sequência, finaliza o range atual
          if (rangeStart === rangeEnd) {
            ranges.push(`${rangeStart}h`);
          } else {
            ranges.push(`${rangeStart}-${rangeEnd + 1}h`);
          }
          rangeStart = violatingHours[i];
          rangeEnd = violatingHours[i];
        }
      }
      
      // Adiciona o último range
      if (rangeStart === rangeEnd) {
        ranges.push(`${rangeStart}h`);
      } else {
        ranges.push(`${rangeStart}-${rangeEnd + 1}h`);
      }
      
      const rangesStr = ranges.join(", ");
      errors.push(
        `${dayNames[day]}: Você preencheu horários fora do range permitido (${inicio}-${fim}h). Horários fora do range: ${rangesStr}.`
      );
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
  
  // Valida range de horários de trabalho (inicio-fim)
  const workingHoursResult = validateWorkingHoursRange(scheduleRow, rules.inicio, rules.fim);
  allErrors.push(...workingHoursResult.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
