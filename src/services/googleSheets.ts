// Serviço para integração com Google Sheets
// Utiliza a Google Sheets API v4
// Modo offline/desenvolvimento: quando true, não faz chamadas reais à API
// Importante: esta flag roda no cliente; use apenas variável pública para evitar
// mismatch de hidratação entre server/client.
const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === "true";
export interface ScheduleData {
  [day: number]: {
    [hour: number]: "presencial" | "ocupado" | "online" | "reuniao" | "aula" | "almoss" | null;
  };
}
// Interface simplificada para HORAISE (Nome, Email, Frentes + Schedule)
export interface TeamMemberData {
  name: string;
  email: string;
  frentes: string;
  bolsa?: string; // nova coluna Bolsa
  editor?: number; // 1 = pode editar, 0 = sem acesso
  pending?: number; // 1 = pendente aprovação, 0 = aprovado
  schedule?: ScheduleData;
  hp?: string; // nova coluna HP
  ho?: string; // nova coluna HO
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
// Formato atual: [Nome, Email, Frentes, Bolsa, Editor, Pending, HP, HO, ...schedule columns]
const rowToTeamMember = (row: string[]): TeamMemberData => {
  return {
    name: row[0] || "",
    email: row[1] || "",
    frentes: row[2] || "",
    bolsa: row[3] || "",
    editor: Number(row[4] ?? 0) || 0,
    pending: Number(row[5] ?? 0) || 0,
    hp: row[6] || "",
    ho: row[7] || "",
  };
};
// Converte objeto TeamMemberData para linha do Google Sheets (HORAISE)
// Formato atual: [Nome, Email, Frentes, Bolsa, Editor, Pending, HP, HO] (schedule é salvo separadamente)
const teamMemberToRow = (member: TeamMemberData): string[] => {
  return [
    member.name,
    member.email,
    member.frentes,
    member.bolsa ?? "",
    String(member.editor ?? 0),
    String(member.pending ?? 0),
    member.hp ?? "",
    member.ho ?? "",
  ];
};
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
    // Sempre salva o schedule quando fornecido, mesmo se vazio, para permitir limpar na planilha
    if (member.schedule !== undefined) {
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
  "almoss": "L",
};
const CODE_TO_STATUS: Record<string, "presencial" | "ocupado" | "online" | "reuniao" | "aula" | "almoss"> = {
  "A": "aula",
  "P": "presencial",
  "O": "online",
  "X": "ocupado",
  "R": "reuniao",
  "L": "almoss",
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
      const status = (schedule as any)[dayUI]?.[hour] as keyof typeof STATUS_TO_CODE | null | undefined;
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
      if (code && (CODE_TO_STATUS as any)[code]) {
        if (!(schedule as any)[dayUI]) {
          (schedule as any)[dayUI] = {} as any;
        }
        (schedule as any)[dayUI][hour] = (CODE_TO_STATUS as any)[code];
      }
      colIndex++;
    }
  }
  return schedule;
}
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
    // Cada row vem com: [Nome, Email, Frentes, Editor, HP, HO, ...scheduleColumns]
    const members: TeamMemberData[] = [];
    for (const row of payload.members) {
      const memberData = rowToTeamMember(row);
          // Extrai o schedule a partir da coluna G (índice 6) em diante
          const scheduleRow = row.slice(6);
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
