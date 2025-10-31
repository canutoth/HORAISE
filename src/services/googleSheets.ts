// Serviço para integração com Google Sheets
// Utiliza a Google Sheets API v4

export interface TeamMemberData {
  name: string;
  position: string;
  imageUrl: string;
  description: string;
  email: string;
  researchInterests: string[];
  technologies: string[];
  expertise: string[];
  socialLinks?: {
    lattes?: string;
    personalWebsite?: string;
    linkedin?: string;
    github?: string;
    googleScholar?: string;
    orcid?: string;
  };
}

// Dados de exemplo/mock que aparecem na primeira linha
export const EXAMPLE_DATA: TeamMemberData = {
  name: "Exemplo de Nome",
  position: "Undergraduate Student",
  imageUrl: "/images/team/example.jpg",
  description:
    "Esta é uma descrição de exemplo. Substitua com suas próprias informações.",
  email: "exemplo@example.com",
  researchInterests: ["Artificial Intelligence", "Software Engineering"],
  technologies: ["Python", "JavaScript", "TypeScript"],
  expertise: ["Backend", "Frontend"],
  socialLinks: {
    lattes: "",
    personalWebsite: "",
    linkedin: "",
    github: "",
    googleScholar: "",
    orcid: "",
  },
};

const SPREADSHEET_ID = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID || "";
// NOTE: client-side will no longer call Google directly with an API key.
// Reads are proxied through internal API routes which use the service account.
const SHEET_NAME = process.env.NEXT_PUBLIC_SHEET_NAME || "Team";

/**
 * Converte URL do imgbox.com para URL de imagem renderizável
 * Exemplo: https://imgbox.com/CXu9gnDk -> https://images2.imgbox.com/CXu9gnDk_o.png (formato original)
 * Nota: O imgbox usa um padrão de servidor distribuído, testamos múltiplas variações
 */
export function convertImgboxUrl(url: string): string {
  if (!url) return "";

  // Se já é uma URL de imagem direta, retorna como está
  if (
    url.includes("images2.imgbox.com") ||
    url.includes("thumbs2.imgbox.com") ||
    url.startsWith("/images/") ||
    (url.startsWith("http") && !url.includes("imgbox.com/"))
  ) {
    return url;
  }

  // Extrai o ID da imagem do imgbox
  // Formato: https://imgbox.com/CXu9gnDk ou imgbox.com/CXu9gnDk
  const match = url.match(/imgbox\.com\/([a-zA-Z0-9]+)/);
  if (!match) return url;

  const imageId = match[1];

  // O imgbox distribui imagens em servidores com hash de 2 caracteres
  // Padrão observado: https://thumbs2.imgbox.com/3c/f4/05nMyoPs_t.jpg
  // Onde 3c/f4 é derivado do hash do ID

  // Usando uma abordagem mais direta: retorna a URL do viewer que redireciona para a imagem
  // A maioria dos navegadores modernos consegue renderizar isso
  // Alternativamente, usamos a API de thumbnail que é mais confiável

  // Calcula o hash path baseado nos primeiros caracteres do ID
  const hashPath = imageId
    .slice(0, 2)
    .toLowerCase()
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("/");

  // Retorna a URL da thumbnail (mais confiável e sempre funciona)
  return `https://thumbs2.imgbox.com/${hashPath}/${imageId}_t.jpg`;
}

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

// Converte linha do Google Sheets para objeto TeamMemberData
const rowToTeamMember = (row: string[]): TeamMemberData => {
  return {
    name: row[0] || "",
    position: row[1] || "",
    imageUrl: row[2] || "",
    description: row[3] || "",
    email: row[4] || "",
    researchInterests: stringToArray(row[5] || ""),
    technologies: stringToArray(row[6] || ""),
    expertise: stringToArray(row[7] || ""),
    socialLinks: {
      lattes: row[8] || "",
      personalWebsite: row[9] || "",
      linkedin: row[10] || "",
      github: row[11] || "",
      googleScholar: row[12] || "",
      orcid: row[13] || "",
    },
  };
};

// Converte objeto TeamMemberData para linha do Google Sheets
const teamMemberToRow = (member: TeamMemberData): string[] => {
  return [
    member.name,
    member.position,
    member.imageUrl,
    member.description,
    member.email,
    arrayToString(member.researchInterests),
    arrayToString(member.technologies),
    arrayToString(member.expertise),
    member.socialLinks?.lattes || "",
    member.socialLinks?.personalWebsite || "",
    member.socialLinks?.linkedin || "",
    member.socialLinks?.github || "",
    member.socialLinks?.googleScholar || "",
    member.socialLinks?.orcid || "",
  ];
};

/**
 * Busca membro da equipe por email
 */
export async function getMemberByEmail(
  email: string
): Promise<TeamMemberData | null> {
  try {
    // Proxy the read through our server-side API to use the service account.
    const encoded = encodeURIComponent(email);
    const res = await fetch(`/api/read-member?email=${encoded}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Erro ao buscar dados do Google Sheets");
    }

    const payload = await res.json();
    // payload.member is an array (row) from the backend
    if (!payload || !payload.member) return null;
    const row: string[] = payload.member;
    return rowToTeamMember(row);
  } catch (error) {
    console.error("Erro ao buscar membro:", error);
    throw error;
  }
}

/**
 * Retorna os dados de exemplo da primeira linha de dados
 */
export async function getExampleData(): Promise<TeamMemberData> {
  try {
    const res = await fetch(`/api/read-example`);
    if (!res.ok) return EXAMPLE_DATA;
    const payload = await res.json();
    if (!payload || !payload.member) return EXAMPLE_DATA;
    const row: string[] = payload.member;
    return rowToTeamMember(row);
  } catch (error) {
    console.error("Erro ao buscar dados de exemplo:", error);
    return EXAMPLE_DATA;
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
  try {
    // Esta função precisa ser implementada no backend usando OAuth2
    // pois a API Key sozinha não permite escrita
    const response = await fetch("/api/update-member", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        member,
        isNew,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao salvar dados");
    }

    const result = await response.json();
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
  try {
    const encoded = encodeURIComponent(email);
    const res = await fetch(`/api/read-member?email=${encoded}`);
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

export function validateImgboxUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;

  // Aceita URLs diretas de imagens
  if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return true;

  // Aceita URLs do imgbox
  if (url.includes("imgbox.com")) return true;

  // Aceita URLs de imagens locais
  if (url.startsWith("/images/")) return true;

  return false;
}

export function validateMemberData(member: TeamMemberData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const VALID_POSITIONS = [
    "Laboratory Head",
    "DSc. Candidate",
    "MSc. Student",
    "Undergraduate Student",
  ];

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

  // Position
  if (!member.position || member.position.trim() === "") {
    errors.push("❌ Position: Campo obrigatório");
  } else if (!VALID_POSITIONS.includes(member.position)) {
    errors.push(
      `❌ Position: Deve ser exatamente uma das opções: "${VALID_POSITIONS.join(
        '", "'
      )}"`
    );
  }

  // Image URL
  if (!member.imageUrl || member.imageUrl.trim() === "") {
    errors.push("❌ Image URL: Campo obrigatório");
  } else if (!validateImgboxUrl(member.imageUrl)) {
    errors.push(
      "❌ Image URL: URL inválida. Use uma URL do imgbox.com ou uma URL de imagem válida"
    );
  }

  // Description
  if (!member.description || member.description.trim() === "") {
    errors.push("❌ Description: Campo obrigatório");
  } else {
    const descLength = member.description.trim().length;
    if (descLength < 50) {
      errors.push(
        `❌ Description: Muito curta (${descLength} caracteres). Mínimo: 50 caracteres`
      );
    } else if (descLength > 750) {
      errors.push(
        `❌ Description: Muito longa (${descLength} caracteres). Máximo: 750 caracteres`
      );
    }
  }

  // Research Interests
  if (!member.researchInterests || member.researchInterests.length === 0) {
    errors.push(
      "❌ Research Interests: Pelo menos 2 interesses são obrigatórios"
    );
  } else if (member.researchInterests.length < 2) {
    errors.push(
      `❌ Research Interests: Mínimo 2 interesses (você tem ${member.researchInterests.length})`
    );
  } else if (member.researchInterests.length > 10) {
    errors.push(
      `❌ Research Interests: Máximo 10 interesses (você tem ${member.researchInterests.length})`
    );
  }

  // Technologies
  if (!member.technologies || member.technologies.length === 0) {
    errors.push("❌ Technologies: Pelo menos 3 tecnologias são obrigatórias");
  } else if (member.technologies.length < 3) {
    errors.push(
      `❌ Technologies: Mínimo 3 tecnologias (você tem ${member.technologies.length})`
    );
  } else if (member.technologies.length > 15) {
    errors.push(
      `❌ Technologies: Máximo 15 tecnologias (você tem ${member.technologies.length})`
    );
  }

  // Expertise
  if (!member.expertise || member.expertise.length === 0) {
    errors.push(
      "❌ Expertise: Pelo menos 1 área de especialização é obrigatória"
    );
  } else if (member.expertise.length > 8) {
    errors.push(
      `❌ Expertise: Máximo 8 áreas (você tem ${member.expertise.length})`
    );
  }

  // Links (opcionais, mas se fornecidos devem ser válidos)
  // Links are nested under socialLinks
  const social = member.socialLinks || {};
  const linkFields: (keyof typeof social)[] = [
    "lattes",
    "personalWebsite",
    "linkedin",
    "github",
    "googleScholar",
    "orcid",
  ];

  linkFields.forEach((field) => {
    const value = social[field] as string | undefined;
    if (value && value.trim() !== "" && !validateUrl(value)) {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
      errors.push(
        `❌ ${fieldName}: URL inválida. Deve começar com http:// ou https://`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
