export interface ScheduleValidation {
  isValid: boolean;
  message: string;
  details: {
    totalPresencial: number;
    totalOnline: number;
    totalReuniao: number;
    totalGeral: number; // Reunião conta apenas 1x
    requiredHP: number;
    requiredHO: number;
    requiredTotal: number;
  };
}
export function validateScheduleHours(
  scheduleRow: string[],
  requiredHP: number,
  requiredHO: number
): ScheduleValidation {
  // Conta as horas por tipo
  let totalPresencial = 0;
  let totalOnline = 0;
  let totalReuniao = 0;
  for (const cell of scheduleRow) {
    const value = (cell || "").toUpperCase();
    if (value === "P") totalPresencial++;
    else if (value === "O") totalOnline++;
    else if (value === "R") totalReuniao++;
  }
  // Total geral = soma sem duplicar reunião
  const totalGeral = totalPresencial + totalOnline + totalReuniao;
  const requiredTotal = requiredHP + requiredHO;
  const details = {
    totalPresencial,
    totalOnline,
    totalReuniao,
    totalGeral,
    requiredHP,
    requiredHO,
    requiredTotal,
  };
  // Validação: total geral deve ser igual ao total requerido
  if (totalGeral !== requiredTotal) {
    return {
      isValid: false,
      message: `Total de horas inválido. Você precisa de ${requiredHP}h presencial + ${requiredHO}h online.`,
      details,
    };
  }
  // Validação adicional: garantir que há horas suficientes quando separamos por tipo
  // Reunião é coringa, então pode ser usada para completar qualquer déficit
  // Mas não podemos ter mais horas específicas (P ou O) do que o requerido + reuniões disponíveis
  // Se não tem reunião nenhuma, deve ter exatamente HP presenciais e HO online
  if (totalReuniao === 0) {
    if (totalPresencial !== requiredHP || totalOnline !== requiredHO) {
      return {
        isValid: false,
        message: `Você deve ter ${requiredHP}h presenciais e ${requiredHO}h online. Atual: ${totalPresencial}h presenciais e ${totalOnline}h online.`,
        details,
      };
    }
  } else {
    // Com reuniões, verificamos se as horas específicas não ultrapassam o requerido
    // E se as reuniões completam o resto
    const deficitPresencial = Math.max(0, requiredHP - totalPresencial);
    const deficitOnline = Math.max(0, requiredHO - totalOnline);
    const deficitTotal = deficitPresencial + deficitOnline;
    // As reuniões devem cobrir exatamente o déficit
    if (totalReuniao !== deficitTotal) {
      return {
        isValid: false,
        message: `Com ${totalPresencial}h presenciais e ${totalOnline}h online, você precisaria de ${deficitTotal}h de reunião ou acrescentar (${deficitPresencial}h para cobrir presencial e ${deficitOnline}h para online).`,
        details,
      };
    }
  }
  return {
    isValid: true,
    message: `Horário válido! Total: ${totalGeral}h (${totalPresencial}h presenciais + ${totalOnline}h online + ${totalReuniao}h reuniões).`,
    details,
  };
}
export function parseHours(hoursStr: string): number {
  const parsed = parseFloat(hoursStr || "0");
  return isNaN(parsed) ? 0 : parsed;
}
