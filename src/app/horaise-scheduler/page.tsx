"use client";

import React, { useState, useEffect } from "react";
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
  Select,
  MultiSelect,
  Radio,
  Group,
  Badge,
  Divider,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconSearch,
  IconUsers,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { getAllMembers } from "../../services/googleSheets";

// Lista de frentes disponíveis
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

// Mapeamento de horários (7h às 19h) e dias úteis
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
// Novo padrão: planilha e schedule usam ordem Segunda(0) .. Domingo(6)
const DAY_LABELS_FULL = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];
const WEEKDAY_UI_INDICES = [0, 1, 2, 3, 4]; // Segunda..Sexta no índice 0..4

interface TimeSlot {
  day: number;
  hour: number;
  dayName: string;
  hourLabel: string;
  memberStatuses?: { name: string; status: string | null }[]; // Status de cada membro nesse horário
}

interface CompatibilityResult {
  level: number; // 1-5 conforme as opções de busca
  slots: TimeSlot[];
  message: string;
  members?: any[]; // Membros analisados
}

export default function SchedulerPage() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<"frente" | "pessoas">("frente");
  const [selectedFrente, setSelectedFrente] = useState<string | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [excludedFromFrente, setExcludedFromFrente] = useState<string[]>([]); // Emails excluídos da frente
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Duração fixa em 1 hora
  const duration = 1;

  // Define o título da página
  useEffect(() => {
    document.title = "HORAISE | Scheduler";
  }, []);

  // Carrega todos os membros ao montar o componente
  useEffect(() => {
    loadAllMembers();
  }, []);

  const loadAllMembers = async () => {
    const timeoutId = setTimeout(() => {
      console.log("⏰ Timeout: Forçando fim do loading após 5 segundos");
      setLoadingMembers(false);
      setErrorMessage("Timeout ao carregar dados. Você pode buscar por frente usando a lista pré-definida.");
    }, 5000);

    try {
      setLoadingMembers(true);
      setErrorMessage("");
      console.log("🔄 Carregando membros...");
      const members = await getAllMembers();
      console.log("✅ Membros carregados:", members.length);
      setAllMembers(members);
      clearTimeout(timeoutId);
    } catch (error) {
      console.error("❌ Erro ao carregar membros:", error);
      setErrorMessage("Erro ao carregar dados do Google Sheets. Você ainda pode buscar por frente usando a lista pré-definida.");
      clearTimeout(timeoutId);
      // Mesmo com erro, não deixa travado - permite buscar por frente
    } finally {
      setLoadingMembers(false);
      console.log("✅ Loading finalizado");
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Filtra membros com base no modo de busca
      let membersToAnalyze: any[] = [];

      if (searchMode === "frente" && selectedFrente) {
        membersToAnalyze = allMembers.filter((member) =>
          member.frentes.split(",").map((f: string) => f.trim()).includes(selectedFrente) &&
          !excludedFromFrente.includes(member.email) // Exclui membros removidos
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

      // Analisa compatibilidade (sempre 1 hora)
      const compatibility = findCompatibleSlots(membersToAnalyze, duration);
      setResult({ ...compatibility, members: membersToAnalyze });
    } catch (error) {
      console.error("Erro ao buscar compatibilidade:", error);
    } finally {
      setLoading(false);
    }
  };

  const findCompatibleSlots = (members: any[], durationHours: number): CompatibilityResult => {
    // Nível 1: Todos trabalhando (presencial ou online)
    const level1Slots = findSlotsWithCondition(members, durationHours, (statuses, membersList) => {
      return statuses.every((s) => s === "presencial" || s === "online");
    });

    if (level1Slots.length > 0) {
      return {
        level: 1,
        slots: level1Slots,
        message: `🎉 Ótima notícia! Encontrei ${level1Slots.length} horário(s) em que todos estão trabalhando!`,
      };
    }

    // Nível 2: Parte trabalhando (presencial ou online), resto livre (null)
    const level2Slots = findSlotsWithCondition(members, durationHours, (statuses, membersList) => {
      const hasWorking = statuses.some((s) => s === "presencial" || s === "online");
      const allWorkingOrFree = statuses.every((s) => s === "presencial" || s === "online" || s === null);
      return hasWorking && allWorkingOrFree;
    });

    if (level2Slots.length > 0) {
      return {
        level: 2,
        slots: level2Slots,
        message: `✅ Encontrei ${level2Slots.length} horário(s) em que parte está trabalhando e o resto está livre!`,
      };
    }

    // Nível 3: Todos livres
    const level3Slots = findSlotsWithCondition(members, durationHours, (statuses, membersList) => {
      return statuses.every((s) => s === null);
    });

    if (level3Slots.length > 0) {
      return {
        level: 3,
        slots: level3Slots,
        message: `✅ Encontrei ${level3Slots.length} horário(s) em que todos estão livres!`,
      };
    }

    // Nível 4: pelo menos uma pessoa em reunião, ninguém ocupado ou em aula, resto pode ser livre ou trabalhando
    const level4Slots = findSlotsWithCondition(members, durationHours, (statuses, membersList) => {
      const hasMeeting = statuses.some((s) => s === "reuniao");
      const noOccupiedOrClass = statuses.every(
        (s) => s === "presencial" || s === "online" || s === null || s === "reuniao"
      );
      return hasMeeting && noOccupiedOrClass;
    });

    if (level4Slots.length > 0) {
      return {
        level: 4,
        slots: level4Slots,
        message: `⚠️ Encontrei ${level4Slots.length} horário(s), mas algumas pessoas estão em reunião. Vale conversar!`,
      };
    }

    // Nenhuma compatibilidade encontrada
    return {
      level: 0,
      slots: [],
      message:
        "😅 Ops! Parece que os horários não batem... Que tal conversar com o pessoal para ver se alguém consegue flexibilizar a agenda? 🤝",
    };
  };

  const findSlotsWithCondition = (
    members: any[],
    durationHours: number,
    condition: (statuses: (string | null)[], members: any[]) => boolean
  ): TimeSlot[] => {
    const validSlots: TimeSlot[] = [];

  // Percorre segunda a sexta (apenas dias úteis)
    for (const day of WEEKDAY_UI_INDICES) {
      // Percorre os horários reais (7..19), verificando blocos consecutivos
      for (let startRealHour = 7; startRealHour <= 19 - (durationHours - 1); startRealHour++) {
        let isValid = true;
        let slotStatuses: { name: string; status: string | null }[] = [];

        // Verifica se o bloco de durationHours horas consecutivas atende a condição
        for (let offset = 0; offset < durationHours; offset++) {
          const realHour = startRealHour + offset;
          const statuses = members.map((member) => {
            if (!member.schedule || !member.schedule[day]) return null;
            return member.schedule[day][realHour] || null;
          });

          // Guarda os status do primeiro horário do bloco
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
            hourLabel: `${startRealHour}h - ${startRealHour + durationHours}h`,
            memberStatuses: slotStatuses,
          });
        }
      }
    }

    return validSlots;
  };

  // Enquanto carrega os membros, evita renderizar a página completa para não causar "layout shift"
  if (loadingMembers) {
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
          <Text c="white" fw={600}>Carregando dados do Scheduler…</Text>
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
      <Container size="md">
        <Paper
          key={`scheduler-${searchMode}-${selectedFrente}-${selectedPeople.join(',')}`}
          shadow="xl"
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack gap="lg">
            {/* Botão Voltar */}
            <Box>
              <Button
                leftSection={<IconArrowLeft size={18} />}
                variant="light"
                color="var(--primary)"
                onClick={() => router.push("/")}
              >
                Voltar
              </Button>
            </Box>

            {/* Header */}
            <Box ta="center">
              <Title
                order={1}
                size="h2"
                style={{
                  background: "var(--primary)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginBottom: 8,
                }}
              >
                HORAISE Scheduler
              </Title>
              <Text size="sm" c="dimmed">
                Encontre horários em comum para reuniões
              </Text>
            </Box>

            {/* Instruções */}
            <Alert
              icon={<IconAlertCircle size={18} />}
              title="Como funciona"
              color="var(--primary)"
              variant="light"
            >
              <Text size="sm">
                Busque horários compatíveis por frente ou por pessoas específicas.
                O sistema analisa automaticamente a melhor combinação de horários disponíveis.
              </Text>
            </Alert>

            {/* Loading removido do corpo para evitar mudança de layout; já tratamos com tela cheia acima */}

            {/* Erro ao carregar */}
            {errorMessage && !loadingMembers && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="Atenção"
                color="orange"
                variant="light"
              >
                <Text size="sm">{errorMessage}</Text>
              </Alert>
            )}

            {/* Modo de Busca */}
            <Stack gap="sm">
              <Text size="sm" fw={600} style={{ color: "var(--primary)" }}>
                Buscar por:
              </Text>
              <Radio.Group value={searchMode} onChange={(val) => setSearchMode(val as any)}>
                <Group>
                  <Radio value="frente" label="Frente" color="var(--primary)" />
                  <Radio value="pessoas" label="Pessoas" color="var(--primary)" />
                </Group>
              </Radio.Group>
            </Stack>

            {/* Seleção de Frente */}
            {searchMode === "frente" && (
              <Stack gap="sm">
                <Select
                  label="Selecione a frente"
                  placeholder="Escolha uma frente"
                  data={FRENTES_LIST}
                  value={selectedFrente}
                  onChange={(value) => {
                    setSelectedFrente(value);
                    setExcludedFromFrente([]); // Limpa exclusões ao trocar de frente
                  }}
                  searchable
                  comboboxProps={{
                    position: "bottom",
                    middlewares: { flip: false, shift: false },
                    dropdownPadding: 4,
                  }}
                  styles={{
                    label: {
                      color: "var(--primary)",
                      fontWeight: 600,
                      size: "sm",
                    },
                  }}
                />
                
                {/* Membros da Frente com opção de remover */}
                {selectedFrente && !loadingMembers && (
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">
                      Membros da frente (clique no X para remover da reunião):
                    </Text>
                    <Group gap="xs">
                      {allMembers
                        .filter((member) =>
                          member.frentes.split(",").map((f: string) => f.trim()).includes(selectedFrente)
                        )
                        .map((member) => {
                          const firstName = member.name.split(" ")[0];
                          const isExcluded = excludedFromFrente.includes(member.email);
                          return (
                            <Badge
                              key={member.email}
                              size="lg"
                              variant={isExcluded ? "outline" : "light"}
                              color={isExcluded ? "gray" : "var(--primary)"}
                              rightSection={
                                <IconX
                                  size={14}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    if (isExcluded) {
                                      setExcludedFromFrente(excludedFromFrente.filter(e => e !== member.email));
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

            {/* Seleção de Pessoas */}
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
                comboboxProps={{
                  position: "bottom",
                  middlewares: { flip: false, shift: false },
                  dropdownPadding: 4,
                }}
                styles={{
                  label: {
                    color: "var(--primary)",
                    fontWeight: 600,
                  },
                }}
              />
            )}

            {/* Botão de Busca */}
            <Button
              size="md"
              fullWidth
              onClick={handleSearch}
              disabled={
                loading ||
                (searchMode === "frente" && (!selectedFrente || loadingMembers)) ||
                (searchMode === "pessoas" && (selectedPeople.length === 0 || loadingMembers || allMembers.length === 0))
              }
              rightSection={
                loading ? <Loader size="xs" color="white" /> : <IconSearch size={18} />
              }
              style={{
                background: "var(--primary)",
                border: "none",
                opacity: loading ||
                  (searchMode === "frente" && (!selectedFrente || loadingMembers)) ||
                  (searchMode === "pessoas" && (selectedPeople.length === 0 || loadingMembers || allMembers.length === 0)) ? 0.6 : 1,
              }}
              styles={{
                root: {
                  "&:hover": {
                    opacity: 0.9,
                  },
                },
              }}
            >
              {loading ? "Buscando..." : "Buscar Horários"}
            </Button>

            {/* Resultados */}
            {result && (
              <Paper
                p="md"
                radius="md"
                style={{
                  background:
                    result.level === 0
                      ? "#fff3cd"
                      : result.level === 1
                      ? "#d1f2eb"
                      : result.level === 2 || result.level === 2.5
                      ? "#d1ecf1"
                      : "#fff3cd",
                  border: `2px solid ${
                    result.level === 0
                      ? "#ffc107"
                      : result.level === 1
                      ? "#28a745"
                      : result.level === 2 || result.level === 2.5
                      ? "#17a2b8"
                      : "#ffc107"
                  }`,
                }}
              >
                <Stack gap="md">
                  {/* Mensagem */}
                  <Alert
                    icon={
                      result.level === 0 ? (
                        <IconAlertCircle size={18} />
                      ) : result.level === 1 ? (
                        <IconCheck size={18} />
                      ) : (
                        <IconClock size={18} />
                      )
                    }
                    color={
                      result.level === 0
                        ? "yellow"
                        : result.level === 1
                        ? "green"
                        : result.level === 2 || result.level === 2.5
                        ? "cyan"
                        : "yellow"
                    }
                    variant="filled"
                  >
                    <Text size="sm" fw={600}>
                      {result.message}
                    </Text>
                  </Alert>

                  {/* Status dos membros: mostrar apenas em casos especiais */}
                  {(result.level === 1 || result.level === 2.5) && result.slots.length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Text size="sm" fw={600} c="black" mb="xs">
                          Status dos membros:
                        </Text>
                        {result.level === 1 && result.slots[0].memberStatuses ? (
                          <Group gap="xs">
                            {result.slots[0].memberStatuses.map((memberStatus, idx) => {
                              const firstName = memberStatus.name.split(" ")[0];
                              const statusLabel = memberStatus.status === "presencial"
                                ? "presencial"
                                : memberStatus.status === "online"
                                ? "online"
                                : "trabalhando";
                              return (
                                <Badge
                                  key={idx}
                                  size="md"
                                  variant="dot"
                                  color={
                                    memberStatus.status === "presencial" || memberStatus.status === "online"
                                      ? "green"
                                      : "green"
                                  }
                                >
                                  {firstName}: {statusLabel}
                                </Badge>
                              );
                            })}
                          </Group>
                        ) : (
                          // Nível 2.5: todos livres
                          <Group gap="xs">
                            {(result.members || []).map((m, idx) => (
                              <Badge key={idx} size="md" variant="dot" color="gray">
                                {m.name.split(" ")[0]}: livre
                              </Badge>
                            ))}
                          </Group>
                        )}
                      </Box>
                    </>
                  )}

                  {/* Lista de Horários com status por tipo em cada horário */}
                  {result.slots.length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Text size="sm" fw={600} c="black" mb="sm">
                          Horários disponíveis:
                        </Text>
                        <Stack gap="sm">
                          {result.slots.map((slot, index) => {
                            const statuses = slot.memberStatuses || [];
                            // Agrupa por tipo de status
                            const groups: Record<string, string[]> = {
                              presencial: [],
                              online: [],
                              livre: [], // null
                              reuniao: [],
                              aula: [],
                              ocupado: [],
                            };
                            statuses.forEach((ms) => {
                              const firstName = ms.name.split(" ")[0];
                              if (ms.status === null) groups.livre.push(firstName);
                              else if (ms.status === "presencial") groups.presencial.push(firstName);
                              else if (ms.status === "online") groups.online.push(firstName);
                              else if (ms.status === "reuniao") groups.reuniao.push(firstName);
                              else if (ms.status === "aula") groups.aula.push(firstName);
                              else if (ms.status === "ocupado") groups.ocupado.push(firstName);
                            });

                            // Ordem amigável de exibição
                            const order: Array<{
                              key: keyof typeof groups;
                              label: string;
                              color: string;
                            }> = [
                              { key: "presencial", label: "Presencial", color: "green" },
                              { key: "online", label: "Online", color: "teal" },
                              { key: "livre", label: "Livre", color: "gray" },
                              { key: "reuniao", label: "Reunião", color: "orange" },
                              { key: "aula", label: "Aula", color: "red" },
                              { key: "ocupado", label: "Ocupado", color: "red" },
                            ];

                            return (
                              <Paper key={index} p="xs" radius="md" withBorder>
                                <Stack gap={6}
                                  style={{
                                    overflowX: "auto",
                                  }}
                                >
                                  <Group gap="xs" wrap="wrap" align="center">
                                    <Badge size="sm" variant="light" color="var(--primary)" leftSection={<IconClock size={14} />}>
                                      {slot.dayName} - {slot.hourLabel}
                                    </Badge>
                                  </Group>
                                  <Group gap="xs" wrap="wrap" align="center">
                                    {order.map(({ key, label, color }) =>
                                      groups[key].length > 0 ? (
                                        <Group key={key} gap={6} wrap="wrap" align="center" style={{ marginRight: 8 }}>
                                          <Text size="xs" c="dimmed">{label}:</Text>
                                          <Group gap={4} wrap="wrap" align="center">
                                            {groups[key].map((name, i) => (
                                              <Badge key={`${key}-${i}`} size="xs" variant="light" color={color}>
                                                {name}
                                              </Badge>
                                            ))}
                                          </Group>
                                        </Group>
                                      ) : null
                                    )}
                                  </Group>
                                </Stack>
                              </Paper>
                            );
                          })}
                        </Stack>
                      </Box>
                    </>
                  )}
                </Stack>
              </Paper>
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
