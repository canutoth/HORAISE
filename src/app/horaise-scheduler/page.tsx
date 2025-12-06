"use client";
import React, { useState, useEffect } from "react";
import TopNavBar from "@/components/TopNavBar";

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
  Select,
  MultiSelect,
  Radio,
  Group,
  Badge,
  Divider,
  Grid,
  Table,
  HoverCard,
  ThemeIcon,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconSearch,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconX,
  IconUser,
  IconBuildingSkyscraper,
  IconWifi,
  IconSchool,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { getAllMembers } from "../../services/googleSheets";

// --- CONSTANTES ---
const FRENTES_LIST = [
  "AI4Health",
  "AISE_Website",
  "Annotaise",
  "Diversity4SE",
  "EcoSustain",
  "EyesOnSmells",
  "IA4Law",
  "LLMs4SA",
  "ML4NFR",
  "ML4Smells",
  "ML4SPL",
  "SE4Finance",
  "SLR_ML4SPL",
  "SM&P",
  "StoneLab",
];

const WEEKDAY_UI_INDICES = [0, 1, 2, 3, 4]; // Segunda..Sexta
const DAY_LABELS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS_DISPLAY = Array.from({ length: 13 }, (_, i) => i + 7); // 7 a 19

interface TimeSlot {
  day: number;
  hour: number;
  dayName: string;
  hourLabel: string;
  memberStatuses?: { name: string; status: string | null }[];
}

interface CompatibilityResult {
  level: number;
  slots: TimeSlot[];
  message: string;
  members?: any[];
}

export default function SchedulerPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<"frente" | "pessoas">("frente");
  const [selectedFrente, setSelectedFrente] = useState<string | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [excludedFromFrente, setExcludedFromFrente] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const duration = 1;

  useEffect(() => {
    document.title = "HORAISE | Scheduler";
    loadAllMembers();
  }, []);

  // --- LÓGICA DE CARREGAMENTO ---
  const loadAllMembers = async () => {
    const timeoutId = setTimeout(() => {
      setLoadingMembers(false);
      setErrorMessage(
        "Timeout ao carregar dados. Você pode buscar por frente usando a lista pré-definida."
      );
    }, 5000);

    try {
      setLoadingMembers(true);
      setErrorMessage("");
      const members = await getAllMembers();
      setAllMembers(members);
      clearTimeout(timeoutId);
    } catch (error) {
      console.error("❌ Erro ao carregar membros:", error);
      setErrorMessage(
        "Erro ao carregar dados do Google Sheets. Você ainda pode buscar por frente usando a lista pré-definida."
      );
      clearTimeout(timeoutId);
    } finally {
      setLoadingMembers(false);
    }
  };

  // --- LÓGICA DE BUSCA ---
  const handleSearch = async () => {
    setLoading(true);
    setResult(null);

    try {
      let membersToAnalyze: any[] = [];

      if (searchMode === "frente" && selectedFrente) {
        membersToAnalyze = allMembers.filter(
          (member) =>
            member.frentes
              .split(",")
              .map((f: string) => f.trim())
              .includes(selectedFrente) &&
            !excludedFromFrente.includes(member.email)
        );
      } else if (searchMode === "pessoas" && selectedPeople.length > 0) {
        membersToAnalyze = allMembers.filter((member) =>
          selectedPeople.includes(member.email)
        );
      }

      if (membersToAnalyze.length === 0) {
        setResult({
          level: 0,
          slots: [],
          message: "Nenhum membro encontrado com os critérios selecionados.",
          members: [],
        });
        setLoading(false);
        return;
      }

      const compatibility = findCompatibleSlots(membersToAnalyze, duration);
      setResult({ ...compatibility, members: membersToAnalyze });
    } catch (error) {
      console.error("Erro ao buscar compatibilidade:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ALGORITMO DE COMPATIBILIDADE ---
  const findCompatibleSlots = (
    members: any[],
    durationHours: number
  ): CompatibilityResult => {
    // Nível 1: Todos trabalhando
    const level1Slots = findSlotsWithCondition(
      members,
      durationHours,
      (statuses) => {
        return statuses.every((s) => s === "presencial" || s === "online");
      }
    );
    if (level1Slots.length > 0) {
      return {
        level: 1,
        slots: level1Slots,
        message: `🎉 Encontrei ${level1Slots.length} horários onde TODOS estão trabalhando!`,
      };
    }

    // Nível 2: Parte trabalhando, resto livre
    const level2Slots = findSlotsWithCondition(
      members,
      durationHours,
      (statuses) => {
        const hasWorking = statuses.some(
          (s) => s === "presencial" || s === "online"
        );
        const allWorkingOrFree = statuses.every(
          (s) => s === "presencial" || s === "online" || s === null
        );
        return hasWorking && allWorkingOrFree;
      }
    );
    if (level2Slots.length > 0) {
      return {
        level: 2,
        slots: level2Slots,
        message: `✅ Encontrei ${level2Slots.length} horários (Parte trabalhando / Parte livre).`,
      };
    }

    // Nível 3: Todos livres
    const level3Slots = findSlotsWithCondition(
      members,
      durationHours,
      (statuses) => {
        return statuses.every((s) => s === null);
      }
    );
    if (level3Slots.length > 0) {
      return {
        level: 3,
        slots: level3Slots,
        message: `✅ Encontrei ${level3Slots.length} horários onde TODOS estão livres.`,
      };
    }

    // Nível 4: Conflitos leves (reuniões)
    const level4Slots = findSlotsWithCondition(
      members,
      durationHours,
      (statuses) => {
        const hasMeeting = statuses.some((s) => s === "reuniao");
        const noOccupiedOrClass = statuses.every(
          (s) =>
            s === "presencial" ||
            s === "online" ||
            s === null ||
            s === "reuniao"
        );
        return hasMeeting && noOccupiedOrClass;
      }
    );
    if (level4Slots.length > 0) {
      return {
        level: 4,
        slots: level4Slots,
        message: `⚠️ Encontrei ${level4Slots.length} horários com conflito de reunião.`,
      };
    }

    return {
      level: 0,
      slots: [],
      message: "😅 Nenhum horário compatível encontrado.",
    };
  };

  const findSlotsWithCondition = (
    members: any[],
    durationHours: number,
    condition: (statuses: (string | null)[], members: any[]) => boolean
  ): TimeSlot[] => {
    const validSlots: TimeSlot[] = [];
    const DAY_LABELS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

    for (const day of WEEKDAY_UI_INDICES) {
      for (
        let startRealHour = 7;
        startRealHour <= 19 - (durationHours - 1);
        startRealHour++
      ) {
        let isValid = true;
        let slotStatuses: { name: string; status: string | null }[] = [];

        for (let offset = 0; offset < durationHours; offset++) {
          const realHour = startRealHour + offset;
          const statuses = members.map((member) => {
            if (!member.schedule || !member.schedule[day]) return null;
            return member.schedule[day][realHour] || null;
          });

          if (offset === 0) {
            slotStatuses = members.map((member) => ({
              name: member.name,
              status: member.schedule?.[day]?.[realHour] || null,
            }));
          }

          if (!condition(statuses, members)) {
            isValid = false;
            break;
          }
        }

        if (isValid) {
          validSlots.push({
            day,
            hour: startRealHour,
            dayName: DAY_LABELS_FULL[day],
            hourLabel: `${startRealHour}h`,
            memberStatuses: slotStatuses,
          });
        }
      }
    }
    return validSlots;
  };

  // --- HELPER PARA RENDERIZAR DETALHES DO HOVER ---
  const renderHoverContent = (slot: TimeSlot) => {
    const statuses = slot.memberStatuses || [];
    // Agrupa por tipo
    const groups: Record<string, string[]> = {
      presencial: [],
      online: [],
      livre: [],
      reuniao: [],
      aula: [],
      ocupado: [],
    };

    statuses.forEach((ms) => {
      const name = ms.name.split(" ")[0];
      if (ms.status === "presencial") groups.presencial.push(name);
      else if (ms.status === "online") groups.online.push(name);
      else if (ms.status === "reuniao") groups.reuniao.push(name);
      else if (ms.status === "aula") groups.aula.push(name);
      else if (ms.status === "ocupado") groups.ocupado.push(name);
      else groups.livre.push(name); // null
    });

    const categories = [
      { key: "presencial", label: "Presencial", color: "green", icon: IconBuildingSkyscraper },
      { key: "online", label: "Online", color: "teal", icon: IconWifi },
      { key: "livre", label: "Livre", color: "gray", icon: IconUser },
      { key: "reuniao", label: "Reunião", color: "orange", icon: IconClock },
      { key: "aula", label: "Aula", color: "red", icon: IconSchool },
      { key: "ocupado", label: "Ocupado", color: "red", icon: IconX },
    ];

    return (
      <Stack gap="xs" p="xs">
        <Text size="sm" fw={700} c="var(--primary)">
          {slot.dayName} às {slot.hourLabel}
        </Text>
        <Divider />
        {categories.map((cat) => {
          if (groups[cat.key].length === 0) return null;
          return (
            <Group key={cat.key} align="start" gap="xs">
              <ThemeIcon size="xs" color={cat.color} variant="light">
                <cat.icon size={12} />
              </ThemeIcon>
              <Box>
                <Text size="xs" fw={600} c="dimmed">
                  {cat.label}:
                </Text>
                <Text size="xs" lh={1.2}>
                  {groups[cat.key].join(", ")}
                </Text>
              </Box>
            </Group>
          );
        })}
      </Stack>
    );
  };

  return (
    <>
      <TopNavBar />
      <Box
        style={{
          minHeight: "100vh",
          background: "#F8F9FF",
          display: "flex",
          flexDirection: "column",
          paddingTop: "140px"
        }}
      >
        <Container size="96%" style={{ width: "100%" }}>
          <Grid gutter={40}>
            <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
                <Stack gap="xl">
                  <Box ta="left">
                    <Title  
                      order={1}
                      size="h1" 
                      style={{ marginBottom: 8 }}
                    >
                    <span
                      style={{
                      background: "#0E1862", 
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontWeight: 800,
                      }}
                    >
                    HORAISE
                    </span>
                    {" "}
                    <span
                      style={{
                      color: "#8EC9FC", 
                      fontWeight: 800,  
                    }}
                    >
                    SCHEDULER
                    </span>
                  </Title>
                    <Text size="sm" c="dimmed">
                      Busque horários compatíveis por frente ou por pessoas específicas. O sistema analisa automaticamente a melhor combinação de horários disponíveis.
                    </Text>
                  </Box>

                  {errorMessage && !loadingMembers && (
                    <Alert
                      icon={<IconAlertCircle size={18} />}
                      title="Erro"
                      color="red"
                      variant="light"
                    >
                      <Text size="sm">{errorMessage}</Text>
                    </Alert>
                  )}

                  <Stack gap="sm">
                    <Text size="sm" fw={600} style={{ color: "var(--primary)" }}>
                      Buscar por:
                    </Text>
                    <Radio.Group
                      value={searchMode}
                      onChange={(val) => setSearchMode(val as any)}
                    >
                      <Group>
                        <Radio value="frente" label="Frente" />
                        <Radio value="pessoas" label="Pessoas" />
                      </Group>
                    </Radio.Group>
                  </Stack>

                  {searchMode === "frente" && (
                    <Stack gap="sm">
                      <Select
                        label="Selecione a frente"
                        placeholder="Escolha uma frente"
                        data={FRENTES_LIST}
                        value={selectedFrente}
                        onChange={(value) => {
                          setSelectedFrente(value);
                          setExcludedFromFrente([]);
                        }}
                        searchable
                        comboboxProps={{ position: "bottom" }}
                      />
                      {selectedFrente && !loadingMembers && (
                        <Box>
                          <Text size="sm" fw={600} c="dimmed" mb="xs">
                            Membros:
                          </Text>
                          <Group gap={6}>
                            {allMembers
                              .filter((member) =>
                                member.frentes
                                  .split(",")
                                  .map((f: string) => f.trim())
                                  .includes(selectedFrente)
                              )
                              .map((member) => {
                                const firstName = member.name.split(" ")[0];
                                const isExcluded = excludedFromFrente.includes(member.email);
                                return (
                                  <Badge
                                    key={member.email}
                                    size="sm"
                                    variant={isExcluded ? "outline" : "light"}
                                    color={isExcluded ? "gray" : "blue"}
                                    rightSection={
                                      <IconX
                                        size={10}
                                        style={{ cursor: "pointer" }}
                                        onClick={() => {
                                          if (isExcluded) {
                                            setExcludedFromFrente(
                                              excludedFromFrente.filter((e) => e !== member.email)
                                            );
                                          } else {
                                            setExcludedFromFrente([...excludedFromFrente, member.email]);
                                          }
                                        }}
                                      />
                                    }
                                    style={{
                                      cursor: "pointer",
                                      opacity: isExcluded ? 0.5 : 1,
                                      textDecoration: isExcluded ? "line-through" : "none",
                                    }}
                                  >
                                    {firstName}
                                  </Badge>
                                );
                              })}
                          </Group>
                        </Box>
                      )}
                    </Stack>
                  )}

                  {searchMode === "pessoas" && (
                    <MultiSelect
                      label="Selecione as pessoas"
                      placeholder="Escolha uma pessoa"
                      data={allMembers
                        .map((m) => ({ value: m.email, label: m.name }))
                        .sort((a, b) => a.label.localeCompare(b.label))}
                      value={selectedPeople}
                      onChange={setSelectedPeople}
                      disabled={loadingMembers || allMembers.length === 0}
                      searchable
                      clearable={false}
                    />
                  )}

                  <Button
                    size="md"
                    fullWidth
                    onClick={handleSearch}
                    disabled={loading}
                    loading={loading}
                    rightSection={<IconSearch size={18} />}
                    color="blue"
                  >
                    Buscar
                  </Button>
                </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
              {!result && !loading && (
                <Center h="100%" style={{ minHeight: "400px", opacity: 0.5 }}>
                  <Stack align="center">
                    <IconSearch size={48} color="gray" />
                    <Text c="dimmed">Os resultados aparecerão aqui</Text>
                  </Stack>
                </Center>
              )}

              {result && (
                  <Stack gap="md">
                    
                    <Table
                      striped
                      highlightOnHover
                      withTableBorder
                      withColumnBorders
                      style={{
                        textAlign: "center",
                        background: "white",
                      }}
                    >
                      <Table.Thead bg="gray.1">
                        <Table.Tr>
                          <Table.Th style={{ width: "80px", textAlign: "center" }}>Horário</Table.Th>
                          {DAY_LABELS_SHORT.map((day) => (
                            <Table.Th key={day} style={{ textAlign: "center" }}>
                              {day}
                            </Table.Th>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {HOURS_DISPLAY.map((hour) => (
                          <Table.Tr key={hour}>
                            <Table.Td style={{ fontWeight: 500, color: "#888" }}>
                              {hour}:00
                            </Table.Td>
                            {WEEKDAY_UI_INDICES.map((dayIndex) => {
                              // Verifica se este slot específico (dia/hora) existe nos resultados
                              const matchedSlot = result.slots.find(
                                (s) => s.day === dayIndex && s.hour === hour
                              );

                              if (matchedSlot) {
                                // Define cor baseada no nível de compatibilidade
                                const cellColor =
                                  result.level === 1
                                    ? "green.1" // Todos trabalhando
                                    : result.level === 2
                                    ? "teal.1" // Misto
                                    : result.level === 3
                                    ? "cyan.1" // Todos livres
                                    : "yellow.1"; // Com conflito leve

                                const badgeColor =
                                  result.level === 1
                                    ? "green"
                                    : result.level === 2
                                    ? "teal"
                                    : result.level === 3
                                    ? "cyan"
                                    : "yellow";

                                return (
                                  <Table.Td
                                    key={`${dayIndex}-${hour}`}
                                    bg={cellColor}
                                    style={{ cursor: "pointer", padding: 0 }}
                                  >
                                    <HoverCard
                                      width={280}
                                      shadow="md"
                                      position="bottom"
                                      withArrow
                                    >
                                      <HoverCard.Target>
                                        <Box
                                          w="100%"
                                          h="100%"
                                          p="xs"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <Badge size="xs" color={badgeColor} variant="filled">
                                            Disp
                                          </Badge>
                                        </Box>
                                      </HoverCard.Target>
                                      <HoverCard.Dropdown>
                                        {renderHoverContent(matchedSlot)}
                                      </HoverCard.Dropdown>
                                    </HoverCard>
                                  </Table.Td>
                                );
                              }

                              return (
                                <Table.Td key={`${dayIndex}-${hour}`} bg="white" />
                              );
                            })}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Stack>
              )}
            </Grid.Col>
          </Grid>

          <Center mt="xl">
            <Text size="xs" c="dimmed" ta="center">
              © 2025 AISE Lab
            </Text>
          </Center>
        </Container>
      </Box>
    </>
  );
}