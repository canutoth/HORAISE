// Serviço para integração com Google Sheets
// Utiliza a Google Sheets API v4
export interface ScheduleData {
  [day: number]: {
    [hour: number]: "presencial" | "ocupado" | "online" | "reuniao" | "aula" | "almoco" | null;
  };
}
// Interface simplificada para HORAISE (Nome, Email, Frentes + Schedule)
export interface TeamMemberData {
  name: string;
  nickname?: string;
  email: string;
  frentes: string;
  bolsa?: string; // nova coluna Bolsa
  editor?: number; // 1 = pode editar, 0 = sem acesso
  pendingAccess?: number; // 1 = pendente aprovação de cadastro, 0 = aprovado
  pendingTimeTable?: number; // 0 = horário aprovado, 1 = horário pendente aprovação, 2 = horário pendente com exceção solicitada
  pendingSuggestion?: number; // 1 = admin sugeriu horário, 0 = sem sugestão pendente
  schedule?: ScheduleData;
  suggestedSchedule?: ScheduleData; // horário sugerido pelo admin
  hp?: string; // nova coluna HP
  ho?: string; // nova coluna HO
}

// Helper para obter o valor de uma coluna pelo nome ao invés do índice
function getColumnValue(row: string[], columnName: string, columnMapping: Map<string, number>): string {
  const index = columnMapping.get(columnName);
  if (index === undefined) {
    console.warn(`Coluna "${columnName}" não encontrada no cabeçalho`);
    return "";
  }
  return row[index] || "";
}

// Converte linha do Google Sheets (HORAISE) para objeto TeamMemberData
// IMPORTANTE: Sempre requer columnMapping - sem fallback para índices fixos
const rowToTeamMember = (row: string[], columnMapping?: Map<string, number>): TeamMemberData => {
  if (!columnMapping) {
    console.error("rowToTeamMember: columnMapping é obrigatório! As colunas devem ser mapeadas por nome.");
    // Retorna dados mínimos para evitar crash
    return {
      name: "Erro: Sem Mapeamento",
      email: "",
      frentes: "",
      bolsa: "",
      editor: 0,
      pendingAccess: 0,
      pendingTimeTable: 0,
      pendingSuggestion: 0,
      hp: "",
      ho: "",
    };
  }

  // Usa columnMapping para acessar por nome de coluna
  const rawName = getColumnValue(row, "Nome", columnMapping);
  const email = getColumnValue(row, "Email", columnMapping);

  return {
    name: rawName,
    nickname: columnMapping.has("Apelido") ? getColumnValue(row, "Apelido", columnMapping) : "",
    email: email,
    frentes: getColumnValue(row, "Frentes", columnMapping),
    bolsa: getColumnValue(row, "Bolsa", columnMapping),
    editor: Number(getColumnValue(row, "Editor", columnMapping) || 0),
    pendingAccess: Number(getColumnValue(row, "Pending-Access", columnMapping) || 0),
    pendingTimeTable: Number(getColumnValue(row, "Pending-TimeTable", columnMapping) || 0),
    pendingSuggestion: Number(getColumnValue(row, "Pending-Suggestion", columnMapping) || 0),
    hp: getColumnValue(row, "HP", columnMapping),
    ho: getColumnValue(row, "HO", columnMapping),
  };
};
export async function getMemberByEmail(
  email: string
): Promise<TeamMemberData | null> {
  try {
    // Proxy the read through our server-side API to use the service account.
    const res = await fetch(`/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-member", email }),
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Erro ao buscar dados do Google Sheets");
    }
    const payload = await res.json();
  // payload.member is an array (row) from the backend
    if (!payload || !payload.member) return null;
    const row: string[] = payload.member;
    // Converte o columnMapping de objeto para Map
    const columnMapping = payload.columnMapping ? new Map<string, number>(Object.entries(payload.columnMapping)) : undefined;
    const memberData = rowToTeamMember(row, columnMapping);
    // Carrega o schedule da planilha HORAISE
    try {
      const schedule = await loadScheduleFromSheet(email);
      if (schedule) {
        memberData.schedule = schedule;
      }
    } catch (scheduleError) {
      console.warn("Não foi possível carregar schedule:", scheduleError);
      // Continua sem o schedule se houver erro
    }
    return memberData;
  } catch (error) {
    console.error("Erro ao buscar membro:", error);
    throw error;
  }
}
export async function getExampleData(): Promise<TeamMemberData> {
  const fallback: TeamMemberData = {
    name: "Exemplo",
    email: "exemplo@example.com",
    frentes: "Frente Exemplo",
    schedule: {},
  };
  try {
    const res = await fetch(`/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-example" }),
    });
    if (!res.ok) return fallback;
    const payload = await res.json();
    if (!payload || !payload.member) return fallback;
    const row: string[] = payload.member;
    // Converte o columnMapping de objeto para Map
    const columnMapping = payload.columnMapping ? new Map<string, number>(Object.entries(payload.columnMapping)) : undefined;
    return rowToTeamMember(row, columnMapping);
  } catch (error) {
    console.error("Erro ao buscar dados de exemplo:", error);
    return fallback;
  }
}
export async function saveMember(
  member: TeamMemberData,
  isNew: boolean = false,
  isAdmin: boolean = false
): Promise<{ success: boolean; message: string; errors?: string[] }> {
  try {
    // Salva os dados básicos do membro na aba Team
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-member", member, isNew }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao salvar dados");
    }
    const result = await response.json();
    // Só salva o schedule se NÃO for um cadastro novo e se o schedule foi fornecido
    // Em cadastros novos, o schedule não deve ser salvo ainda (usuário ainda não tem acesso)
    if (!isNew && member.schedule !== undefined) {
      const scheduleResult = await saveScheduleToSheet(member.email, member.schedule, isAdmin);
      if (!scheduleResult.success) {
        // Se o schedule falhou, retorna o erro ao invés de ignorar
        return {
          success: false,
          message: scheduleResult.message,
          errors: scheduleResult.errors,
        };
      }
    }
    return result;
  } catch (error) {
    console.error("Erro ao salvar membro:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
// Utilidades para validação
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
export function validateMemberData(member: TeamMemberData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  // Nome
  if (!member.name || member.name.trim() === "") {
    errors.push("❌ Nome: Campo obrigatório");
  }
  // Email
  if (!member.email || !validateEmail(member.email)) {
    errors.push("❌ Email: Email válido é obrigatório");
  } else if (member.email === "exemplo@example.com") {
    errors.push(
      "❌ Email: Não é possível usar o email de exemplo. Use seu email real"
    );
  }
  // Frentes
  if (!member.frentes || member.frentes.trim() === "") {
    errors.push("❌ Frentes: Campo obrigatório");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
// ============================================
// FUNÇÕES PARA MANIPULAR SCHEDULES NA PLANILHA HORAISE
// ============================================
// Mapeamento de status para códigos da planilha
const STATUS_TO_CODE: Record<string, string> = {
  "aula": "A",
  "presencial": "P",
  "online": "O",
  "ocupado": "X",
  "reuniao": "R",
  "almoco": "L",
};
const CODE_TO_STATUS: Record<string, "presencial" | "ocupado" | "online" | "reuniao" | "aula" | "almoco"> = {
  "A": "aula",
  "P": "presencial",
  "O": "online",
  "X": "ocupado",
  "R": "reuniao",
  "L": "almoco",
};
export function scheduleToInfoRow(schedule: ScheduleData): string[] {
  // Cria array com 91 colunas (7 dias x 13 horas) mapeando D..CN
  const row: string[] = new Array(91).fill("");
  // Começa no primeiro bloco (Domingo)
  let colIndex = 0;
  // Dias no UI: 0=Dom .. 6=Sab
  for (let dayUI = 0; dayUI <= 6; dayUI++) {
    // Para cada horário real (7..19)
    for (let hour = 7; hour <= 19; hour++) {
      const status = schedule[dayUI]?.[hour];
      const code = status ? STATUS_TO_CODE[status] || "" : "";
      row[colIndex] = code;
      colIndex++;
    }
  }
  return row;
}
export function infoRowToSchedule(infoRow: string[]): ScheduleData {
  const schedule: ScheduleData = {};
  // Começa no primeiro bloco (Domingo), índice 0
  let colIndex = 0;
  // Dias no UI: 0=Dom .. 6=Sab
  for (let dayUI = 0; dayUI <= 6; dayUI++) {
    // Para cada horário real (7..19)
    for (let hour = 7; hour <= 19; hour++) {
      const code = infoRow[colIndex]?.trim().toUpperCase();
      if (code && CODE_TO_STATUS[code]) {
        if (!schedule[dayUI]) {
          schedule[dayUI] = {};
        }
        schedule[dayUI][hour] = CODE_TO_STATUS[code];
      }
      colIndex++;
    }
  }
  return schedule;
}
export async function saveScheduleToSheet(
  email: string,
  schedule: ScheduleData,
  isAdmin: boolean = false
): Promise<{ success: boolean; message: string; errors?: string[] }> {
  try {
    let infoRow = scheduleToInfoRow(schedule);
    // Garantia extra: ajusta comprimento para exatamente 91 colunas (7 dias x 13 horas)
    if (infoRow.length < 91) {
      infoRow = [...infoRow, ...new Array(91 - infoRow.length).fill("")];
    } else if (infoRow.length > 91) {
      infoRow = infoRow.slice(0, 91);
    }
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-schedule", email, scheduleRow: infoRow, isAdmin }),
    });
    if (!response.ok) {
      const error = await response.json();
      // Retorna o erro estruturado ao invés de fazer throw
      return {
        success: false,
        message: error.message || "Erro ao salvar schedule",
        errors: error.errors, // Inclui array de erros se existir
      };
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao salvar schedule:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido ao salvar schedule",
    };
  }
}
export async function loadScheduleFromSheet(email: string): Promise<ScheduleData | null> {
  try {
    const response = await fetch(`/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load-schedule", email }),
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Erro ao carregar schedule");
    }
    const payload = await response.json();
    if (!payload || !payload.scheduleRow) return null;
    return infoRowToSchedule(payload.scheduleRow);
  } catch (error) {
    console.error("Erro ao carregar schedule:", error);
    return null;
  }
}
export async function getAllMembers(): Promise<TeamMemberData[]> {
  try {
    const res = await fetch(`/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-all-members" }),
    });
    if (!res.ok) {
      throw new Error("Erro ao buscar todos os membros");
    }
    const payload = await res.json();
    if (!payload || !payload.members) return [];
    // Primeira linha é o cabeçalho
    if (payload.members.length === 0) return [];

    const headerRow = payload.members[0];
    const columnMapping = new Map<string, number>();
    headerRow.forEach((col: string, idx: number) => {
      columnMapping.set(col, idx);
    });

    // Converte cada linha para TeamMemberData (pula o cabeçalho)
    const members: TeamMemberData[] = [];
    for (let i = 1; i < payload.members.length; i++) {
      const row = payload.members[i];
      const memberData = rowToTeamMember(row, columnMapping);

          // Extrai o schedule a partir da coluna após HO
          const hoIndex = columnMapping.get("HO");
          if (hoIndex === undefined) continue;
          const scheduleRow = row.slice(hoIndex + 1);
      if (scheduleRow && scheduleRow.length > 0) {
        const schedule = infoRowToSchedule(scheduleRow);
        if (schedule) {
          memberData.schedule = schedule;
        }
      }
      members.push(memberData);
    }
    return members;
  } catch (error) {
    console.error("Erro ao buscar todos os membros:", error);
    throw error;
  }
}

export async function getBacklogOptions(): Promise<{
  frentes: Array<{ name: string; emoji: string }>;
  bolsas: Array<{ name: string; color: string }>
}> {
  try {
    const res = await fetch(`/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-backlog-options" }),
    });

    if (!res.ok) {
      throw new Error("Erro ao buscar opções do backlog");
    }

    const payload = await res.json();

    if (!payload || !payload.frentes || !payload.bolsas) {
      return { frentes: [], bolsas: [] };
    }

    return {
      frentes: payload.frentes,
      bolsas: payload.bolsas,
    };
  } catch (error) {
    console.error("Erro ao buscar opções do backlog:", error);
    return { frentes: [], bolsas: [] };
  }
}

/**
 * Salva um schedule sugerido para um membro (apenas admins)
 */
export async function saveSuggestedSchedule(
  adminEmail: string,
  targetEmail: string,
  schedule: ScheduleData
): Promise<{ success: boolean; message: string }> {
  try {
    let infoRow = scheduleToInfoRow(schedule);

    // Garantia: ajusta comprimento para exatamente 91 colunas
    if (infoRow.length < 91) {
      infoRow = [...infoRow, ...new Array(91 - infoRow.length).fill("")];
    } else if (infoRow.length > 91) {
      infoRow = infoRow.slice(0, 91);
    }

    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save-suggested-schedule",
        adminEmail,
        targetEmail,
        scheduleRow: infoRow
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || "Erro ao salvar sugestão"
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao salvar sugestão:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido ao salvar sugestão"
    };
  }
}

/**
 * Aceita a sugestão de schedule do admin
 */
export async function acceptSuggestedSchedule(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept-suggested-schedule", email }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || "Erro ao aceitar sugestão"
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Erro ao aceitar sugestão:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido ao aceitar sugestão"
    };
  }
}