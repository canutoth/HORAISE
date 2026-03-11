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
 * Se a pessoa trabalha PRESENCIALMENTE (P), os blocos de P + R (reunião) precisam ter pelo menos X slots seguidos
 * NOTA: 
 * - R (reunião) conta como parte do bloco consecutivo quando há P no mesmo bloco
 * - L (almoço) NÃO interrompe o bloco, mas NÃO conta no total de slots
 * - Blocos que são apenas R não são validados (não violam a regra)
 * - O (online) NÃO faz parte dessa validação
 * 
 * Exemplos (regra mínima = 3):
 * - PLPR = 3 slots válidos (P,P,R) ✅
 * - PPLP = 3 slots válidos (P,P,P) ✅
 * - PLP = 2 slots válidos (P,P) ❌
 */
export function validateConsecutiveSlots(
  scheduleRow: string[],
  minimoSlots: number
): DynamicValidationResult {
  const errors: string[] = [];
  const dayMap = parseScheduleByDay(scheduleRow);
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  
  dayMap.forEach((slots, day) => {
    // Ignora fins de semana (sábado=5, domingo=6)
    if (day >= 5) return;
    
    const streaks: { length: number; hasPresencial: boolean }[] = [];
    let currentStreakLength = 0; // Conta apenas P e R
    let currentStreakHasPresencial = false;
    let inBlock = false; // Indica se estamos dentro de um bloco
    
    for (const slot of slots) {
      // P, R ou L fazem parte do bloco consecutivo
      if (slot === "P" || slot === "R" || slot === "L") {
        inBlock = true;
        
        // Apenas P e R contam no comprimento
        if (slot === "P" || slot === "R") {
          currentStreakLength++;
          if (slot === "P") {
            currentStreakHasPresencial = true;
          }
        }
        // L não interrompe mas não conta
      } else {
        // Fim do bloco, salva se houver algo
        if (inBlock && currentStreakLength > 0) {
          streaks.push({
            length: currentStreakLength,
            hasPresencial: currentStreakHasPresencial
          });
        }
        currentStreakLength = 0;
        currentStreakHasPresencial = false;
        inBlock = false;
      }
    }
    
    // Adiciona o último grupo se terminou no bloco
    if (inBlock && currentStreakLength > 0) {
      streaks.push({
        length: currentStreakLength,
        hasPresencial: currentStreakHasPresencial
      });
    }
    
    // Verifica apenas os blocos que TÊM presencial (P)
    // Blocos que são apenas R não são validados
    const violatingStreaks = streaks.filter(
      s => s.hasPresencial && s.length < minimoSlots
    );
    
    if (violatingStreaks.length > 0) {
      errors.push(
        `${dayNames[day]}: Você tem grupo(s) de trabalho com menos de ${minimoSlots} slots consecutivos.`
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
    // Ignora fins de semana (sábado=5, domingo=6)
    if (day >= 5) return;
    
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
 * Só cobra almoço se a pessoa estiver trabalhando PRESENCIALMENTE antes E depois do intervalo
 * Se trabalhar online antes ou depois, não precisa marcar almoço
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
    
    // CORREÇÃO: Verifica se tem trabalho PRESENCIAL antes do intervalo
    let hasPresencialBefore = false;
    for (let h = lunchStart - baseHour - 1; h >= 0; h--) {
      if (isPresencialSlot(slots[h])) {
        hasPresencialBefore = true;
        break;
      }
    }
    
    // CORREÇÃO: Verifica se tem trabalho PRESENCIAL a partir do início do intervalo (incluindo dentro do intervalo)
    let hasPresencialAfterStart = false;
    for (let h = lunchStart - baseHour; h < slots.length; h++) {
      if (isPresencialSlot(slots[h])) {
        hasPresencialAfterStart = true;
        break;
      }
    }
    
    // CORREÇÃO: Só cobra almoço se tiver trabalho PRESENCIAL antes E a partir do início do intervalo
    if (hasPresencialBefore && hasPresencialAfterStart) {
      // Verifica se o intervalo de almoço está completamente coberto por aulas
      let fullClassWindow = true;
      for (let h = lunchStart - baseHour; h < lunchEnd - baseHour; h++) {
        if (h >= 0 && h < slots.length) {
          if (slots[h] !== "A") { // A = Aula
            fullClassWindow = false;
            break;
          }
        }
      }
      
      // Se o intervalo de almoço está completamente coberto por aulas, não precisa marcar almoço
      if (!fullClassWindow) {
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
            `${dayNames[day]}: Você está trabalhando presencialmente antes e depois do intervalo ${intervaloAlmoco}h. É obrigatório alocar pelo menos 1h de almoço nesse período.`
          );
        }
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
 * A aba INFO sempre tem 7-20h, mas se a pessoa preencher TRABALHO fora do range inicio-fim de RULES,
 * ela é sinalizada para poder solicitar exceção.
 * CORREÇÃO: Esta validação só se aplica a TRABALHO (P, O, R), não a aulas ou outros compromissos
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
    // Ignora fins de semana (sábado=5, domingo=6)
    if (day >= 5) return;
    
    const violatingHours: number[] = [];
    
    slots.forEach((slot, hourIndex) => {
      // CORREÇÃO: Só valida horários de TRABALHO (P, O, R), não valida aulas (A), ocupado (X) ou almoço (L)
      if (isWorkSlot(slot)) {
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
        `${dayNames[day]}: Você preencheu horários de trabalho fora do range permitido (${inicio}-${fim}h).`
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
