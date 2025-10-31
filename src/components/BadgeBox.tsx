import React from "react";
import {
  Paper,
  Group,
  Text,
  Badge,
  ThemeIcon,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

interface BadgeBoxProps {
  title: string; // Título da caixinha
  icon: React.ReactNode; // Ícone exibido ao lado do título
  items: string[]; // Lista de badges a serem exibidas
}

// Componente reutilizável que exibe uma caixinha com título, ícone e um conjunto de badges.
export const BadgeBox: React.FC<BadgeBoxProps> = ({ title, icon, items }) => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  // Se não houver itens, nada a renderizar
  if (!items || items.length === 0) return null;

  return (
    <Paper
      shadow="xs"
      radius="md"
      p="md"
      style={{
        background: "rgba(245,245,245,0.6)",
        flex: 1,
        width: "100%",
      }}
    >
      {/* Cabeçalho: ícone + título */}
      <Group
        mb="xs"
        style={{
          justifyContent: isMobile ? "center" : undefined,
        }}
      >
        <ThemeIcon variant="light" color="var(--primary)" size={32}>
          {icon}
        </ThemeIcon>
        <Text fw={600} c="dimmed" size="md">
          {title}
        </Text>
      </Group>

      {/* Quebra de linha automática e centralização em mobile */}
      <Group
        gap="xs"
        wrap="wrap"
        style={{
          justifyContent: isMobile ? "center" : undefined,
        }}
      >
        {items.map((item, idx) => (
          <Badge
            key={idx}
            color="var(--primary)"
            variant="light"
            radius="sm"
            size="md"
          >
            {item}
          </Badge>
        ))}
      </Group>
    </Paper>
  );
};
