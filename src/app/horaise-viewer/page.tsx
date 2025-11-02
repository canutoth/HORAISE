"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Button,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  Loader,
  Center,
  Group,
  Badge,
  ScrollArea,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { getAllMembers } from "../../services/googleSheets";
import Schedule from "../../components/Schedule";

// Mapeamento de frentes para emojis (mesmo do Editor)
const FRENTE_EMOJIS: Record<string, string> = {
  "StoneLab": "💚",
  "AISE_Website": "🌐",
  "EyesOnSmells": "👁️",
  "IA4Law": "⚖️",
  "LLMs4SA": "🧠",
  "ML4NFR": "🤖",
  "ML4Smells": "👃",
  "ML4SPL": "🧩",
  "SM&P": "🤯",
  "SE4Finance": "💵",
  "SLR_ML4SPL": "📚",
  "Diversity4SE": "🫶",
  "AI4Health": "💉",
  "EcoSustain": "🌱",
  "Annotaise": "📝",
};

export default function VisualizerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const list = await getAllMembers();
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
        setMembers(sorted);
        setCurrentIndex(0);
      } catch (e) {
        console.error("Erro carregando membros:", e);
        setError("Erro ao carregar dados do Google Sheets.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = useMemo(() => (members.length > 0 ? members[currentIndex] : null), [members, currentIndex]);

  const goPrev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  const goNext = () => setCurrentIndex((i) => (i < members.length - 1 ? i + 1 : i));

  // Enquanto carrega os membros, mostra tela cheia de loading para evitar "layout shift"
  if (loading) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <Stack align="center" gap="sm">
          <Loader size="lg" color="white" />
          <Text c="white" fw={600}>Carregando dados do Viewer…</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "var(--primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Container size="lg">
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack gap="lg">
            {/* Barra superior */}
            <Group justify="space-between" wrap="nowrap">
              <Button
                leftSection={<IconArrowLeft size={18} />}
                variant="light"
                color="var(--primary)"
                onClick={() => router.push("/")}
              >
                Voltar
              </Button>
              <Box ta="center" style={{ flex: 1 }}>
                <Title
                  order={1}
                  size="h2"
                  style={{
                    background: "var(--primary)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: 4,
                  }}
                >
                  HORAISE Viewer
                </Title>
                {/* <Text size="sm" c="dimmed">Visualize os horários de todos em ordem alfabética</Text> */}
              </Box>
              <Box style={{ width: 120 }} />
            </Group>

            {error && !loading && (
              <Alert icon={<IconAlertCircle size={18} />} title="Erro" color="red" variant="light">
                <Text size="sm">{error}</Text>
              </Alert>
            )}

            {current && (
              <Stack gap="md">
                {/* Cabeçalho do membro com setas */}
                <Group justify="space-between" align="center">
                  <Button variant="light" color="var(--primary)" onClick={goPrev} disabled={currentIndex === 0} leftSection={<IconChevronLeft size={18} />}></Button>
                  <Box ta="center">
                    <Title order={3} size="h4" style={{ color: "var(--primary)" }}>{current.name}</Title>
                    {/* <Text size="sm" c="dimmed">{current.email}</Text> */}
                    {current.frentes && (
                      <Group gap="xs" justify="center" mt="xs">
                        {current.frentes
                          .split(',')
                          .map((f: string) => f.trim())
                          .filter(Boolean)
                          .sort((a: string, b: string) => a.localeCompare(b))
                          .map((frente: string, idx: number) => {
                            const emoji = FRENTE_EMOJIS[frente] || "📌";
                            return (
                              <Badge key={idx} size="lg" variant="light" color="indigo" style={{ cursor: "default" }}>
                                {emoji} {frente}
                              </Badge>
                            );
                          })}
                      </Group>
                    )}
                  </Box>
                  <Button variant="light" color="var(--primary)" onClick={goNext} disabled={currentIndex >= members.length - 1} rightSection={<IconChevronRight size={18} />}></Button>
                </Group>

                {/* Calendário somente leitura */}
                <Paper p="md" radius="lg" style={{ background: "rgba(255, 255, 255, 0.98)" }}>
                  {/* Lendo com legenda visível, porém sem interação (readOnly) e layout compacto */}
                  <Schedule
                    schedule={current.schedule || {}}
                    onChange={() => {}}
                    readOnly
                    legendWidth={200}
                    spacerWidth={24}
                    compactLegend
                    centerLegendVertically
                  />
                </Paper>
                {/* Faixa de "abas" no estilo Google Sheets */}
                <Box>
                  <Text size="sm" fw={600} c="dimmed" mb="xs">Membros ({members.length})</Text>
                  <Box
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Button variant="subtle" color="var(--primary)" onClick={goPrev} disabled={currentIndex === 0}>
                      <IconChevronLeft size={16} />
                    </Button>
                    <Box
                      style={{
                        overflowX: "auto",
                        overflowY: "hidden",
                        WebkitOverflowScrolling: "touch",
                        flex: 1,
                        paddingBottom: 4,
                        border: "1px solid #e9ecef",
                        borderRadius: 8,
                        background: "#fff",
                      }}
                    >
                      <Group gap="xs" wrap="nowrap" style={{ padding: 6, width: "max-content" }}>
                        {members.map((m, idx) => {
                          const active = idx === currentIndex;
                          return (
                            <Button
                              key={m.email}
                              size="xs"
                              variant={active ? "light" : "subtle"}
                              color={active ? "var(--primary)" : "gray"}
                              onClick={() => setCurrentIndex(idx)}
                              style={{
                                border: active ? "2px solid var(--primary)" : "1px solid #e9ecef",
                                background: active ? "#eef2ff" : "#fff",
                                color: active ? "var(--primary)" : "#495057",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {m.name}
                            </Button>
                          );
                        })}
                      </Group>
                    </Box>
                    <Button variant="subtle" color="var(--primary)" onClick={goNext} disabled={currentIndex >= members.length - 1}>
                      <IconChevronRight size={16} />
                    </Button>
                  </Box>
                </Box>
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* Footer */}
        <Center mt="xl">
          <Text size="xs" c="white" ta="center">
            © 2025 AISE Lab
          </Text>
        </Center>
      </Container>
    </Box>
  );
}
