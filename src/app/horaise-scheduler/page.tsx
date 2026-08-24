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
  ScrollArea, // Adicionado
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks"; // Adicionado
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
import { getAllMembers, getBacklogOptions } from "../../services/googleSheets";
import { getViewerDisplayName } from "../../services/memberNameDisplay";

const WEEKDAY_UI_INDICES = [0, 1, 2, 3, 4];
const DAY_LABELS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS_DISPLAY = Array.from({ length: 13 }, (_, i) => i + 7);

const ROW_HEIGHT = "40px"; 

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
  
  // Hook para detectar mobile
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [searchMode, setSearchMode] = useState<"frente" | "pessoas">("frente");
  const [selectedFrente, setSelectedFrente] = useState<string | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [excludedFromFrente, setExcludedFromFrente] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [frentesOptions, setFrentesOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const duration = 1;

  useEffect(() => {
    document.title = "HORAISE | Scheduler";
    loadAllMembers();
    loadFrentesOptions();
  }, []);

  const loadFrentesOptions = async () => {
    try {
      const options = await getBacklogOptions();
      setFrentesOptions(options.frentes.map((frente) => frente.name));
    } catch (error) {
      console.error("Erro ao carregar frentes do backlog:", error);
    }
  };

  const loadAllMembers = async () => {
    const timeoutId = setTimeout(() => {
      setLoadingMembers(false);
      setErrorMessage(
        "Timeout ao carregar dados. Tente novamente em instantes."
      );
    }, 5000);

    try {
      setLoadingMembers(true);
      setErrorMessage("");
      const members = (await getAllMembers()).map((member) => ({
        ...member,
        displayName: getViewerDisplayName({ name: member.name, nickname: member.nickname }),
      }));
      setAllMembers(members);
      clearTimeout(timeoutId);
    } catch (error) {
      console.error("Erro ao carregar membros:", error);
      setErrorMessage(
        "Erro ao carregar dados do Google Sheets."
      );
      clearTimeout(timeoutId);
    } finally {
      setLoadingMembers(false);
    }
  };

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

  const findCompatibleSlots = (
    members: any[],
    durationHours: number
  ): CompatibilityResult => {
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
        message: `Encontrei ${level1Slots.length} horários onde TODOS estão trabalhando!`,
      };
    }

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
        message: `Encontrei ${level2Slots.length} horários (Parte trabalhando / Parte livre).`,
      };
    }

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
        message: `Encontrei ${level3Slots.length} horários onde TODOS estão livres.`,
      };
    }

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
        message: `Encontrei ${level4Slots.length} horários com conflito de reunião.`,
      };
    }

    return {
      level: 0,
      slots: [],
      message: "Nenhum horário compatível encontrado.",
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
              name: member.displayName,
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

  const renderHoverContent = (slot: TimeSlot) => {
    const statuses = slot.memberStatuses || [];
    const groups: Record<string, string[]> = {
      presencial: [],
      online: [],
      livre: [],
      reuniao: [],
      aula: [],
      ocupado: [],
    };

    statuses.forEach((ms) => {
      const name = ms.name;
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
          // Ajuste de padding para mobile vs desktop
          paddingTop: isMobile ? "80px" : "140px",
        }}
      >
        <Container size="96%" style={{ width: "100%", paddingBottom: "40px" }}>
          {/* Ajuste de gutter para mobile */}
          <Grid gutter={isMobile ? 20 : 40}>
            {/* Seção de Filtros */}
            <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
              
                <Stack gap={isMobile ? "md" : "xl"}>
                  <Box ta="left">
                     <Title  
                      order={1}
                      size={isMobile ? "h3" : "h1"} 
                      style={{ marginBottom: 4, paddingTop: isMobile ? "40px" : "0px"}}
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
                        Busque horários compatíveis por frente ou por pessoas específicas. 
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
                        data={frentesOptions}
                        value={selectedFrente}
                        onChange={(value) => {
                          setSelectedFrente(value);
                          setExcludedFromFrente([]);
                        }}
                        searchable
                        disabled={frentesOptions.length === 0}
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
                                const firstName = member.displayName;
                                const isExcluded = excludedFromFrente.includes(
                                  member.email
                                );
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
                                              excludedFromFrente.filter(
                                                (e) => e !== member.email
                                              )
                                            );
                                          } else {
                                            setExcludedFromFrente([
                                              ...excludedFromFrente,
                                              member.email,
                                            ]);
                                          }
                                        }}
                                      />
                                    }
                                    style={{
                                      cursor: "pointer",
                                      opacity: isExcluded ? 0.5 : 1,
                                      textDecoration: isExcluded
                                        ? "line-through"
                                        : "none",
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
                        .map((m) => ({ value: m.email, label: m.displayName }))
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

            {/* Seção de Resultados */}
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
                    <ScrollArea type="auto" offsetScrollbars>
                      <Table
                        striped
                        highlightOnHover
                        withTableBorder
                        withColumnBorders
                        style={{
                          textAlign: "center",
                          background: "white",
                          tableLayout: "fixed",
                          minWidth: isMobile ? "600px" : "100%" 
                        }}
                      >
                        <Table.Thead bg="gray.1">
                          <Table.Tr>
                            <Table.Th
                              style={{ width: "80px", textAlign: "center", height: ROW_HEIGHT }}
                            >
                              Horário
                            </Table.Th>
                            {DAY_LABELS_SHORT.map((day) => (
                              <Table.Th key={day} style={{ textAlign: "center", height: ROW_HEIGHT }}>
                                {day}
                              </Table.Th>
                            ))}
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {HOURS_DISPLAY.map((hour) => (
                            <Table.Tr key={hour}>
                              <Table.Td
                                style={{ fontWeight: 500, color: "#888", height: ROW_HEIGHT }}
                              >
                                {hour}-{hour+1}h
                              </Table.Td>
                              {WEEKDAY_UI_INDICES.map((dayIndex) => {
                                const matchedSlot = result.slots.find(
                                  (s) => s.day === dayIndex && s.hour === hour
                                );

                                if (matchedSlot) {
                                  let colorBase = "yellow"; 
                                  if (result.level === 1) colorBase = "green";
                                  else if (result.level === 2) colorBase = "teal";
                                  else if (result.level === 3) colorBase = "cyan";

                                  const statuses = matchedSlot.memberStatuses || [];
                                  const total = statuses.length;
                                  const workingCount = statuses.filter(
                                    (m) =>
                                      m.status === "presencial" ||
                                      m.status === "online"
                                  ).length;
                                  const meetingCount = statuses.filter(
                                    (m) => m.status === "reuniao"
                                  ).length;
                                  const freeCount = statuses.filter(
                                    (m) => m.status === null
                                  ).length;

                                  let badgeLabel = "";
                                  if (workingCount === total && total > 0) {
                                    badgeLabel = "Todos trabalhando";
                                  } else if (meetingCount > 0) {
                                    badgeLabel = `${meetingCount} em reunião`;
                                  } else if (freeCount === total && total > 0) {
                                    badgeLabel = "Todos livres";
                                  } else {
                                    badgeLabel = `${workingCount} trabalhando`;
                                  }

                                  return (
                                    <Table.Td
                                      key={`${dayIndex}-${hour}`}
                                      p={0}
                                      style={{ cursor: "pointer", height: ROW_HEIGHT }}
                                    >
                                      <HoverCard
                                        width={280}
                                        shadow="md"
                                        position={isMobile ? "top" : "bottom"} 
                                        withArrow
                                      >
                                        <HoverCard.Target>
                                          <Box
                                            w="100%"
                                            h="100%" 
                                            pl="sm"
                                            bg={`${colorBase}.1`}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "flex-start",
                                              borderLeft: `5px solid var(--mantine-color-${colorBase}-6)`,
                                            }}
                                          >
                                            <Text size="xs" c={`${colorBase}.9`} fw={500} style={{ lineHeight: 1.2 }}>
                                              {isMobile && badgeLabel.includes("trabalhando") ? badgeLabel.replace("trabalhando", "trab.") : badgeLabel}
                                            </Text>
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
                                  <Table.Td
                                    key={`${dayIndex}-${hour}`}
                                    bg="white"
                                    style={{ height: ROW_HEIGHT }}
                                  />
                                );
                              })}
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  </Stack>
              )}
            </Grid.Col>
          </Grid>

          <Center mt="xl">
            <Text size="xs" c="dimmed" ta="center">
              © 2025 AISE Lab - PUC-Rio
            </Text>
          </Center>
        </Container>
      </Box>
    </>
  );
}