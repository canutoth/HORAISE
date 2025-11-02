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
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const goPrev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  const goNext = () => setCurrentIndex((i) => (i < members.length - 1 ? i + 1 : i));

  // Auto-scroll na lista de membros quando muda o índice
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const buttons = container.querySelectorAll('button');
      const activeButton = buttons[currentIndex] as HTMLElement;
      
      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        
        // Se o botão estiver fora da visão à direita
        if (buttonRect.right > containerRect.right) {
          container.scrollLeft = scrollLeft + (buttonRect.right - containerRect.right) + 20;
        }
        // Se o botão estiver fora da visão à esquerda
        else if (buttonRect.left < containerRect.left) {
          container.scrollLeft = scrollLeft - (containerRect.left - buttonRect.left) - 20;
        }
      }
    }
  }, [currentIndex]);

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
        padding: "20px",
      }}
    >
      <Box
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          <Stack gap="lg">
            {/* Barra superior */}
            <Stack gap="sm">
              <Button
                leftSection={<IconArrowLeft size={18} />}
                variant="light"
                color="var(--primary)"
                onClick={() => router.push("/")}
                style={{ alignSelf: "flex-start" }}
              >
                Voltar
              </Button>
              <Box ta="center">
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
              </Box>
            </Stack>

            {error && !loading && (
              <Alert icon={<IconAlertCircle size={18} />} title="Erro" color="red" variant="light">
                <Text size="sm">{error}</Text>
              </Alert>
            )}

            {current && (
              <Stack gap="md">
                {/* Cabeçalho do membro com setas */}
                {/* Desktop: tudo em uma linha */}
                <Box visibleFrom="sm">
                  <Group justify="space-between" align="center">
                    <Button
                      variant="light"
                      color="var(--primary)"
                      onClick={goPrev}
                      disabled={currentIndex === 0}
                      style={{ minWidth: "auto", padding: "8px 12px" }}
                    >
                      <IconChevronLeft size={18} />
                    </Button>
                    <Box ta="center" style={{ flex: 1 }}>
                      <Title order={3} size="h4" style={{ color: "var(--primary)" }}>{current.name}</Title>
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
                    <Button
                      variant="light"
                      color="var(--primary)"
                      onClick={goNext}
                      disabled={currentIndex >= members.length - 1}
                      style={{ minWidth: "auto", padding: "8px 12px" }}
                    >
                      <IconChevronRight size={18} />
                    </Button>
                  </Group>
                </Box>
                
                {/* Mobile: setas englobam nome e badges */}
                <Box hiddenFrom="sm">
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Button
                        variant="light"
                        color="var(--primary)"
                        onClick={goPrev}
                        disabled={currentIndex === 0}
                        style={{ minWidth: "auto", padding: "8px 12px" }}
                      >
                        <IconChevronLeft size={18} />
                      </Button>
                      <Box ta="center" style={{ flex: 1 }}>
                        <Title order={3} size="h4" style={{ color: "var(--primary)" }}>{current.name}</Title>
                      </Box>
                      <Button
                        variant="light"
                        color="var(--primary)"
                        onClick={goNext}
                        disabled={currentIndex >= members.length - 1}
                        style={{ minWidth: "auto", padding: "8px 12px" }}
                      >
                        <IconChevronRight size={18} />
                      </Button>
                    </Group>
                    {current.frentes && (
                      <Group gap="xs" justify="center">
                        {current.frentes
                          .split(',')
                          .map((f: string) => f.trim())
                          .filter(Boolean)
                          .sort((a: string, b: string) => a.localeCompare(b))
                          .map((frente: string, idx: number) => {
                            const emoji = FRENTE_EMOJIS[frente] || "📌";
                            return (
                              <Badge key={idx} size="md" variant="light" color="indigo" style={{ cursor: "default" }}>
                                {emoji} {frente}
                              </Badge>
                            );
                          })}
                      </Group>
                    )}
                  </Stack>
                </Box>

                {/* Calendário somente leitura */}
                <Box style={{ width: "100%", overflow: "visible" }}>
                  <Schedule
                    schedule={current.schedule || {}}
                    onChange={() => {}}
                    readOnly
                    legendWidth={200}
                    spacerWidth={24}
                    compactLegend
                    centerLegendVertically
                  />
                </Box>
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
                      ref={scrollContainerRef}
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
      </Box>
    </Box>
  );
}
