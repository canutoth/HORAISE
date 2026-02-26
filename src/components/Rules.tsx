"use client";
import { useEffect, useState } from "react";
import {
  Paper,
  Group,
  Box,
  Title,
  List,
  ThemeIcon,
  Loader,
  Text,
} from "@mantine/core";
import {
  IconAlertTriangle,
} from "@tabler/icons-react";

interface Rules {
  minimoSlotsConsecutivos: number;
  minimoSlotsDiariosPresencial: number;
  intervaloAlmoco: string;
  inicio: number;
  fim: number;
}

export default function ProfileInstructions() {
  const [rules, setRules] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "read-rules" }),
        });
        const data = await response.json();
        if (data.success && data.rules) {
          setRules(data.rules);
        }
      } catch (error) {
        console.error("Erro ao buscar regras:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, []);

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
      {loading ? (
        <Group justify="center" py="md">
          <Loader size="sm" />
        </Group>
      ) : rules ? (
        <Box>
          <List size="sm" spacing={6}>
            <List.Item>
              O horário de aulas deve refletir exatamente sua grade no SAU
            </List.Item>
            <List.Item>
              Horário de trabalho permitido: <strong>{rules.inicio}h - {rules.fim}h</strong>
            </List.Item>
            <List.Item>
              Intervalo de almoço obrigatório: <strong>{rules.intervaloAlmoco}h</strong> (quando trabalhar antes e depois deste horário)
            </List.Item>
            <List.Item>
              Mínimo de <strong>{rules.minimoSlotsConsecutivos} slots consecutivos</strong> por período de trabalho
            </List.Item>
            <List.Item>
              Mínimo de <strong>{rules.minimoSlotsDiariosPresencial} slots presenciais</strong> em dias com trabalho presencial
            </List.Item>
            <List.Item>
              Caso precise descumprir alguma regra, você pode solicitar uma exceção ao administrador
            </List.Item>
          </List>
        </Box>
      ) : (
        <Text size="sm" c="dimmed">Não foi possível carregar as regras.</Text>
      )}
    </Paper>
  );
}
