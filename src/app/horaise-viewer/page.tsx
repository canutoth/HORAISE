"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
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
  Grid,
  ThemeIcon,
  Table,
  HoverCard,
  Divider,
  Select,
  SimpleGrid, 
} from "@mantine/core";
import {
  IconArrowLeft,
  IconAlertCircle,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconClock,
  IconSchool, 
  IconDeviceLaptop,
  IconBuildingSkyscraper,
  IconUsers,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { getAllMembers } from "../../services/googleSheets";
import TopNavBar from "@/components/TopNavBar";

const FRENTES_EMOJIS: Record<string, string> = {
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

const WEEKDAY_UI_INDICES = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS_DISPLAY = Array.from({ length: 13 }, (_, i) => i + 7);
const ROW_HEIGHT = "40px";

export default function VisualizerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    document.title = "HORAISE | Viewer";
  }, []);

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

  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const buttons = container.querySelectorAll('button');
      const activeButton = buttons[currentIndex] as HTMLElement;
      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        if (buttonRect.right > containerRect.right) {
          container.scrollLeft = scrollLeft + (buttonRect.right - containerRect.right) + 20;
        } else if (buttonRect.left < containerRect.left) {
          container.scrollLeft = scrollLeft - (containerRect.left - buttonRect.left) - 20;
        }
      }
    }
  }, [currentIndex]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "presencial": return { color: "green", label: "Presencial" };
      case "online": return { color: "teal", label: "Online" };
      case "reuniao": return { color: "orange", label: "Reunião" };
      case "aula": return { color: "blue", label: "Aula" };
      case "ocupado": return { color: "red", label: "Ocupado" };
      default: return null;
    }
  };

  const hourCounts = useMemo(() => {
    const counts = { aula: 0, online: 0, presencial: 0, reuniao: 0 };
    if (current && current.schedule) {
      Object.values(current.schedule).forEach((daySlots: any) => {
        Object.values(daySlots).forEach((status: any) => {
          if (status === 'aula') counts.aula++;
          else if (status === 'online') counts.online++;
          else if (status === 'presencial') counts.presencial++;
          else if (status === 'reuniao') counts.reuniao++;
        });
      });
    }
    return counts;
  }, [current]);

  return (
    <>
      <TopNavBar />
      <Box style={{ minHeight: "100vh", background: "#F8F9FF", display: "flex", flexDirection: "column", paddingTop: "140px" }}>
        <Container size="96%" style={{ width: "100%" }}>
          <Grid gutter={40}>
            <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
              <Stack gap="xl">
                <Box ta="left">
                  <Title order={1} size="h1" style={{ marginBottom: 8 }}>
                    <span style={{ background: "#0E1862", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 800 }}>HORAISE</span>{" "}
                    <span style={{ color: "#8EC9FC", fontWeight: 800 }}>VIEWER</span>
                  </Title>
                  <Text size="sm" c="dimmed">Visualize o horário individual de cada membro.</Text>
                </Box>

                {error && <Alert icon={<IconAlertCircle size={18} />} title="Erro" color="red" variant="light">{error}</Alert>}

                {loading ? <Center py="xl"><Loader color="blue" /></Center> : current && (
                  <Stack gap="md">
                    
                    <Select
                      label="Selecionar membro"
                      placeholder="Busque por nome"
                      searchable
                      data={members.map((m, idx) => ({ value: idx.toString(), label: m.name }))}
                      value={currentIndex.toString()}
                      onChange={(val) => { if (val !== null) setCurrentIndex(parseInt(val)); }}
                      styles={{ label: { color: "var(--primary)", fontWeight: 600, marginBottom: 4 } }}
                    />

                    <Stack gap="sm">
                      <Group justify="space-between" w="100%">
                        <Stack gap={0} align="left">
                          <Text fw={700} size="lg" c="#0E1862">{current.name}</Text>
                        </Stack>
                      </Group>

                      {current.frentes && (
                        <Group gap="xs">
                          {current.frentes.split(',').map((f: string) => f.trim()).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b)).map((frente: string, idx: number) => {
                            const emoji = FRENTES_EMOJIS[frente] || "📌";
                            return (
                              <Badge
                                key={idx}
                                size="sm"
                                style={{ textTransform: "none" }}
                                styles={{
                                  root: { backgroundColor: 'rgba(142, 201, 252, 0.2)', color: '#1A202C', border: 'none', fontWeight: 600 }
                                }}
                              >
                                {emoji} {frente}
                              </Badge>
                            );
                          })}
                        </Group>
                      )}

                      <Box mt="xs">
                        <Text size="sm" fw={600} style={{ textDecoration: 'underline', marginBottom: 8, color: '#4A5568' }}>
                          distribuição de horas:
                        </Text>
                        
                        <SimpleGrid cols={1} spacing="sm" verticalSpacing="sm">
                          <Group gap="xs" w="50%">
                            <ThemeIcon variant="light" color="blue" size="sm">
                              <IconSchool size={14} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                              Aula
                            </Text>
                            <Text size="sm" c="dimmed" fw={600}>
                              {hourCounts.aula}h
                            </Text>
                          </Group>
                            
                          <Group gap="xs" w="50%">
                            <ThemeIcon variant="light" color="teal" size="sm">
                              <IconDeviceLaptop size={14} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                              Online
                            </Text>
                            <Text size="sm" c="dimmed" fw={600}>
                              {hourCounts.online}h
                            </Text>
                          </Group>

                          <Group gap="xs" w="50%">
                            <ThemeIcon variant="light" color="green" size="sm">
                              <IconBuildingSkyscraper size={14} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                              Presencial
                            </Text>
                            <Text size="sm" c="dimmed" fw={600}>
                              {hourCounts.presencial}h
                            </Text>
                          </Group>

                          <Group gap="xs" w="50%">
                            <ThemeIcon variant="light" color="orange" size="sm">
                              <IconUsers size={14} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                              Reunião
                            </Text>
                            <Text size="sm" c="dimmed" fw={600}>
                              {hourCounts.reuniao}h
                            </Text>
                          </Group>
                        </SimpleGrid>
                      </Box>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
              {current ? (
                <Stack gap="md">
                  <Table striped highlightOnHover withTableBorder withColumnBorders style={{ textAlign: "center", background: "white", tableLayout: "fixed" }}>
                    <Table.Thead bg="gray.1">
                      <Table.Tr>
                        <Table.Th style={{ width: "80px", textAlign: "center", height: ROW_HEIGHT }}>Horário</Table.Th>
                        {DAY_LABELS_SHORT.map((day) => (<Table.Th key={day} style={{ textAlign: "center", height: ROW_HEIGHT }}>{day}</Table.Th>))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {HOURS_DISPLAY.map((hour) => (
                        <Table.Tr key={hour}>
                          <Table.Td style={{ fontWeight: 500, color: "#888", height: ROW_HEIGHT }}>{hour}:00</Table.Td>
                          {WEEKDAY_UI_INDICES.map((dayIndex) => {
                            const status = current.schedule?.[dayIndex]?.[hour];
                            const config = status ? getStatusConfig(status) : null;
                            if (config) {
                              return (
                                <Table.Td key={`${dayIndex}-${hour}`} p={0} style={{ cursor: "default", height: ROW_HEIGHT }}>
                                  <HoverCard width={200} shadow="md" position="bottom" withArrow>
                                    <HoverCard.Target>
                                      <Box w="100%" h="100%" pl="sm" bg={`${config.color}.1`} style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", borderLeft: `5px solid var(--mantine-color-${config.color}-6)` }}>
                                        <Text size="xs" c={`${config.color}.9`} fw={500} style={{ lineHeight: 1.2 }}>{config.label}</Text>
                                      </Box>
                                    </HoverCard.Target>
                                    <HoverCard.Dropdown>
                                      <Group gap="xs"><IconClock size={16} color="gray" /><Text size="sm">{DAY_LABELS_SHORT[dayIndex]} - {hour}:00</Text></Group>
                                      <Divider my={4} />
                                      <Text size="sm" fw={600} c={config.color}>{config.label}</Text>
                                    </HoverCard.Dropdown>
                                  </HoverCard>
                                </Table.Td>
                              );
                            }
                            return <Table.Td key={`${dayIndex}-${hour}`} bg="white" style={{ height: ROW_HEIGHT }} />;
                          })}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  <Box>
                    <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">Navegação Rápida</Text>
                    <Box ref={scrollContainerRef} style={{ overflowX: "auto", overflowY: "hidden", display: "flex", gap: 8, paddingBottom: 8, scrollBehavior: "smooth" }}>
                      {members.map((m, idx) => {
                        const active = idx === currentIndex;
                        return (
                          <Button
                            key={m.email}
                            size="sm"
                            variant={active ? "filled" : "default"}
                            color={active ? "blue" : "gray"}
                            onClick={() => setCurrentIndex(idx)}
                            px="md"
                            style={{ whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}
                          >
                            {m.name}
                          </Button>
                        );
                      })}
                    </Box>
                  </Box>
                </Stack>
              ) : (
                <Center h={400}><Text c="dimmed">{!loading && "Nenhum membro selecionado."}</Text></Center>
              )}
            </Grid.Col>
          </Grid>
          <Center mt="xl"><Text size="xs" c="dimmed" ta="center">© 2025 AISE Lab</Text></Center>
        </Container>
      </Box>
    </>
  );
}