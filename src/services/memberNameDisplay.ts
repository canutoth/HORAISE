export type NameDisplayInput = {
  name?: string | null;
  nickname?: string | null;
};

const normalizeSpaces = (value: string): string => value.replace(/\s+/g, " ").trim();

export const getFirstTwoNameParts = (fullName?: string | null): string => {
  const normalized = normalizeSpaces(fullName ?? "");
  if (!normalized) return "";
  return normalized.split(" ").slice(0, 2).join(" ");
};

export const getViewerDisplayName = ({ name, nickname }: NameDisplayInput): string => {
  const nick = normalizeSpaces(nickname ?? "");
  if (nick) return nick;
  return getFirstTwoNameParts(name);
};

export const formatAdminDisplayName = ({ name, nickname }: NameDisplayInput): string => {
  const fullName = normalizeSpaces(name ?? "");
  const nick = normalizeSpaces(nickname ?? "");
  if (!fullName) return nick;
  if (!nick) return fullName;
  return `${fullName} (${nick})`;
};

export const toDisplayNameKey = (displayName: string): string => {
  return normalizeSpaces(displayName)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};
