// Serviço para integração com Google Sheets
// Utiliza a Google Sheets API v4

// Modo offline/desenvolvimento: quando true, não faz chamadas reais à API
// Importante: esta flag roda no cliente; use apenas variável pública para evitar
// mismatch de hidratação entre server/client.
const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === "true";

export interface ScheduleData {
  [day: number]: {
    [hour: number]: "presencial" | "ocupado" | "online" | "reuniao" | "aula" | null;
  };
}

// Interface simplificada para HORAISE (Nome, Email, Frentes + Schedule)
export interface TeamMemberData {
  name: string;
  email: string;
  frentes: string;
  schedule?: ScheduleData;
}

// Storage local para modo offline (simula um "banco de dados" em memória)
const offlineStorage: Map<string, TeamMemberData> = new Map();

// Dados mínimos para teste offline
offlineStorage.set("test@test.com", {
  name: "Usuário Teste",
  email: "test@test.com",
  frentes: "Frente Teste",
  schedule: {},
});

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || "";
// NOTE: client-side will no longer call Google directly with an API key.
// Reads are proxied through internal API routes which use the service account.
const SHEET_NAME = process.env.SHEET_NAME || "Team";

// Converte array para string separada por vírgula
const arrayToString = (arr: string[]): string => {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
};

// Converte string separada por vírgula para array
const stringToArray = (str: string): string[] => {
  if (!str || str.trim() === "") return [];
  return str
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

// Converte linha do Google Sheets (HORAISE) para objeto TeamMemberData
// Formato: [Nome, Email, Frentes, ...schedule columns]
const rowToTeamMember = (row: string[]): TeamMemberData => {
  return {
    name: row[0] || "",
    email: row[1] || "",
    frentes: row[2] || "",
  };
};

// Converte objeto TeamMemberData para linha do Google Sheets (HORAISE)
// Formato: [Nome, Email, Frentes] (schedule é salvo separadamente)
const teamMemberToRow = (member: TeamMemberData): string[] => {
  return [
    member.name,
    member.email,
    member.frentes,
  ];
};

/**
 * Busca membro da equipe por email
 */
export async function getMemberByEmail(
  email: string
): Promise<TeamMemberData | null> {
  // Modo offline: retorna dados do storage local
  if (OFFLINE_MODE) {
    console.log("🔌 MODO OFFLINE: Buscando membro no storage local");
    return offlineStorage.get(email) || null;
  }

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
    const memberData = rowToTeamMember(row);
    
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

/**
 * Retorna os dados de exemplo da primeira linha de dados
 */
export async function getExampleData(): Promise<TeamMemberData> {
  const fallback: TeamMemberData = {
    name: "Exemplo",
    email: "exemplo@example.com",
    frentes: "Frente Exemplo",
    schedule: {},
  };

  // Modo offline: retorna dados de exemplo fixos
  if (OFFLINE_MODE) {
    console.log("🔌 MODO OFFLINE: Retornando dados de exemplo");
    return fallback;
  }

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
    return rowToTeamMember(row);
  } catch (error) {
    console.error("Erro ao buscar dados de exemplo:", error);
    return fallback;
  }
}

/**
 * Atualiza ou cria um novo membro
 * Requer autenticação OAuth2 (implementar no backend)
 */
export async function saveMember(
  member: TeamMemberData,
  isNew: boolean = false
): Promise<{ success: boolean; message: string }> {
  // Modo offline: salva no storage local
  if (OFFLINE_MODE) {
    console.log("🔌 MODO OFFLINE: Salvando membro no storage local");
    offlineStorage.set(member.email, member);
    return {
      success: true,
      message: isNew
        ? "✅ Novo membro criado com sucesso (modo offline - dados não sincronizados)"
        : "✅ Dados atualizados com sucesso (modo offline - dados não sincronizados)",
    };
  }

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
    
    // Se houver schedule, salva na planilha HORAISE
    if (member.schedule && Object.keys(member.schedule).length > 0) {
      const scheduleResult = await saveScheduleToSheet(member.email, member.schedule);
      if (!scheduleResult.success) {
        console.warn("Dados salvos mas schedule falhou:", scheduleResult.message);
        // Não retorna erro, pois os dados principais foram salvos
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

/**
 * Encontra a linha de um membro no Google Sheets
 */
export async function findMemberRow(email: string): Promise<number | null> {
  // Modo offline: simula número de linha baseado na existência no storage
  if (OFFLINE_MODE) {
    console.log("🔌 MODO OFFLINE: Simulando busca de linha");
    return offlineStorage.has(email) ? 2 : null; // Simula linha 2 se existir
  }

  try {
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
    return payload.rowNumber || null;
  } catch (error) {
    console.error("Erro ao encontrar linha do membro:", error);
    throw error;
  }
}

// Utilidades para validação
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // URLs opcionais
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
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
};

const CODE_TO_STATUS: Record<string, "presencial" | "ocupado" | "online" | "reuniao" | "aula"> = {
  "A": "aula",
  "P": "presencial",
  "O": "online",
  "X": "ocupado",
  "R": "reuniao",
};

/**
 * Converte objeto ScheduleData para array de códigos (linha da planilha HORAISE)
 * Planilha: A-C (dados), D-P (Dom), Q-AC (Seg), AD-AP (Ter), AQ-BC (Qua), BD-BP (Qui), BQ-CC (Sex), CD-CP (Sab)
 * Schedule usa apenas Seg-Sex (5 dias x 13 horas = 65 colunas), mas na planilha são 91 colunas totais (7 dias)
 * Dias: 0=Segunda, 1=Terça, 2=Quarta, 3=Quinta, 4=Sexta
 * Horas: índice 0-12 representa 7h-20h (0=7h, 1=8h, ..., 12=19h)
 */
export function scheduleToInfoRow(schedule: ScheduleData): string[] {
  // Cria array com 91 colunas (7 dias x 13 horas)
  const row: string[] = new Array(91).fill("");

  // Pula Domingo (13 colunas), começa na coluna 13 (Segunda)
  let colIndex = 13;

  // Para cada dia da semana útil (0=Segunda até 4=Sexta)
  for (let day = 0; day < 5; day++) {
    // Para cada horário (índice 0-12 representando 7h-20h)
    for (let hourIndex = 0; hourIndex < 13; hourIndex++) {
      const status = schedule[day]?.[hourIndex];
      const code = status ? STATUS_TO_CODE[status] || "" : "";
      row[colIndex] = code;
      colIndex++;
    }
  }
  
  return row;
}

/**
 * Converte array de códigos (linha da planilha HORAISE) para objeto ScheduleData
 * Planilha: A-C (dados), D-P (Dom), Q-AC (Seg), AD-AP (Ter), AQ-BC (Qua), BD-BP (Qui), BQ-CC (Sex), CD-CP (Sab)
 * Schedule usa apenas Seg-Sex: índice 13-77 da array (5 dias x 13 horas = 65 posições)
 * Dias: 0=Segunda, 1=Terça, 2=Quarta, 3=Quinta, 4=Sexta
 * Horas: índice 0-12 representa 7h-20h (0=7h, 1=8h, ..., 12=19h)
 */
export function infoRowToSchedule(infoRow: string[]): ScheduleData {
  const schedule: ScheduleData = {};
  
  // Pula Domingo (13 colunas), começa na coluna 13 (Segunda = coluna Q)
  let colIndex = 13;

  // Para cada dia da semana útil (0=Segunda até 4=Sexta)
  for (let day = 0; day < 5; day++) {
    // Para cada horário (índice 0-12 representando 7h-20h)
    for (let hourIndex = 0; hourIndex < 13; hourIndex++) {
      const code = infoRow[colIndex]?.trim().toUpperCase();
      
      if (code && CODE_TO_STATUS[code]) {
        if (!schedule[day]) {
          schedule[day] = {};
        }
        // Usa hourIndex (0-12) como chave, não a hora real (7-20)
        schedule[day][hourIndex] = CODE_TO_STATUS[code];
      }
      
      colIndex++;
    }
  }
  
  return schedule;
}

/**
 * Salva o schedule de uma pessoa na planilha HORAISE
 * @param email - Email da pessoa (usado para encontrar a linha)
 * @param schedule - Objeto ScheduleData com os horários
 */
export async function saveScheduleToSheet(
  email: string,
  schedule: ScheduleData
): Promise<{ success: boolean; message: string }> {
  // Modo offline: salva no storage local (já está sendo feito no saveMember)
  if (OFFLINE_MODE) {
    console.log("🔌 MODO OFFLINE: Schedule salvo localmente junto com memberData");
    return {
      success: true,
      message: "✅ Schedule salvo (modo offline - dados não sincronizados)",
    };
  }

  try {
    const infoRow = scheduleToInfoRow(schedule);
    
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save-schedule", email, scheduleRow: infoRow }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao salvar schedule");
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

/**
 * Lê o schedule de uma pessoa da planilha HORAISE
 * @param email - Email da pessoa (usado para encontrar a linha)
 */
export async function loadScheduleFromSheet(
  email: string
): Promise<ScheduleData | null> {
  // Modo offline: retorna schedule do storage local
  if (OFFLINE_MODE) {
    console.log("🔌 MODO OFFLINE: Schedule carregado do storage local");
    return null; // O schedule já vem junto com o memberData
  }

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

/**
 * Busca todos os membros da planilha
 */
export async function getAllMembers(): Promise<TeamMemberData[]> {
  // Modo offline: retorna dados do storage local
  if (OFFLINE_MODE) {
    console.log("🔌 MODO OFFLINE: Retornando membros do storage local");
    return Array.from(offlineStorage.values());
  }

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
    
    // Converte cada linha para TeamMemberData
    // Agora cada row já vem com: [Nome, Email, Frentes, ...scheduleColumns]
    const members: TeamMemberData[] = [];
    for (const row of payload.members) {
      const memberData = rowToTeamMember(row);
      
      // Extrai o schedule das colunas D em diante (índice 3+)
      const scheduleRow = row.slice(3); // Pega da coluna D (índice 3) até CN
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
