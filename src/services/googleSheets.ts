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
    console.log("🔍 Fazendo fetch para /api com email:", email);
    const res = await fetch(`/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-member", email }),
    });
    console.log("📡 Resposta da API - Status:", res.status, "OK:", res.ok);
    if (!res.ok) {
      if (res.status === 404) return null;
      const errorText = await res.text();
      console.error("❌ Erro na resposta da API:", errorText);
      throw new Error("Erro ao buscar dados do Google Sheets");
    }

    const payload = await res.json();
    console.log("✅ Payload recebido:", payload);
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
 * Converte o objeto ScheduleData para array de códigos (uma linha da planilha HORAISE)
 * Formato: [Dom7-8, Dom8-9, ..., Sab18-19] = 91 colunas (7 dias x 13 horas)
 */
export function scheduleToInfoRow(schedule: ScheduleData): string[] {
  const row: string[] = [];

  // Para cada dia da semana (0=Segunda até 4=Quinta)
  for (let day = 0; day < 5; day++) {
    // Para cada horário (7h até 19h = 13 horários)
    for (let hour = 7; hour <= 19; hour++) {
      const status = schedule[day]?.[hour];
      const code = status ? STATUS_TO_CODE[status] || "" : "";
      row.push(code);
    }
  }
  
  return row;
}

/**
 * Converte array de códigos (linha da planilha HORAISE) para objeto ScheduleData
 * Formato: [Dom7-8, Dom8-9, ..., Sab18-19] = 91 colunas (7 dias x 13 horas)
 */
export function infoRowToSchedule(infoRow: string[]): ScheduleData {
  const schedule: ScheduleData = {};
  let colIndex = 0;

  // Para cada dia da semana (0=Segunda até 4=Sexta)
  for (let day = 0; day < 5; day++) {
    // Para cada horário (7h até 19h = 13 horários)
    for (let hour = 7; hour <= 19; hour++) {
      const code = infoRow[colIndex]?.trim().toUpperCase();
      
      if (code && CODE_TO_STATUS[code]) {
        if (!schedule[day]) {
          schedule[day] = {};
        }
        schedule[day][hour] = CODE_TO_STATUS[code];
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
