"use client";
import {
  Paper,
  Group,
  Box,
  Title,
  List,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertTriangle,
} from "@tabler/icons-react";
export default function ProfileInstructions() {
  return (
    <Paper
      shadow="sm"
      p="md"
      radius="lg"
      mb="md"
      style={{
        background: "#fff",
        border: "1px solid var(--mantine-color-gray-3)",
        color: "var(--mantine-color-dark-8)",
        lineHeight: 1.55,
      }}
    >
      <Group gap="xs" mb="md">
        <ThemeIcon size="lg" variant="light" color="var(--primary)">
          <IconAlertTriangle size={18} />
        </ThemeIcon>
        <Title order={4} style={{ color: "var(--primary)" }}>
          Regras
        </Title>
      </Group>
      {}
      <Box>
        <List size="sm" spacing={6}>
          <List.Item>
            O horário de aulas registrado deve refletir exatamente sua grade no SAU
          </List.Item>
          <List.Item>
            É obrigatório alocar 1 hora de almoço entre 11h e 14h
          </List.Item>
          <List.Item>
            Pelo menos 4 slots diários em dias presenciais
          </List.Item>
          <List.Item>
            Mínimo aceitável: 2 slots consecutivos
          </List.Item>
        </List>
      </Box>
    </Paper>
  );
}
