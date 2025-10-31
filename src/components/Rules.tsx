"use client";

import { useState } from "react";
import {
  Paper,
  Group,
  Box,
  Title,
  Text,
  List,
  Badge,
  Anchor,
  Collapse,
  ThemeIcon,
  UnstyledButton,
  Divider,
  Code,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconAlertTriangle,
} from "@tabler/icons-react";

export default function ProfileInstructions() {
  // Mantém visível por padrão (acessível e menor custo de interação no desktop)
  const [opened, setOpened] = useState(true);

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="lg"
      mb="md"
      style={{
        background: "#fff",
        border: "1px solid var(--mantine-color-gray-3)",
        color: "var(--mantine-color-dark-8)", // texto mais escuro por padrão
        lineHeight: 1.55,
      }}
    >
      {/* Header compacto e clicável */}
      <UnstyledButton
        onClick={() => setOpened((o) => !o)}
        style={{ width: "100%" }}
        aria-expanded={opened}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon size="lg" variant="light" color="var(--primary)">
              <IconAlertTriangle size={18} />
            </ThemeIcon>
            <Title order={4} style={{ color: "var(--mantine-color-dark-9)" }}>
              Regras
            </Title>
          </Group>
          <Group gap="xs">
            {opened ? (
              <IconChevronUp size={18} />
            ) : (
              <IconChevronDown size={18} />
            )}
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={opened} p="md">

        {/* Horários */}
        <Box mb="md">
          
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
      </Collapse>
    </Paper>
  );
}
