"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Alert,
  Loader,
  Center,
  Grid,
  Badge,
  MultiSelect,
  ActionIcon,
  Modal,
  SimpleGrid,
  ThemeIcon,
  Table,
  HoverCard,
  Divider,
  UnstyledButton,
  List,
  ScrollArea, // Adicionado para scroll na tabela e toolbar
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks"; // Adicionado para responsividade
import {
  IconDeviceFloppy,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconPencil,
  IconLock,
  IconSchool,
  IconDeviceLaptop,
  IconBuildingSkyscraper,
  IconUsers,
  IconClock,
  IconBan,
  IconAlertTriangle,
  IconInfoCircle, 
} from "@tabler/icons-react";
import { useRouter, useParams } from "next/navigation";
import { notifications } from "@mantine/notifications";
import {
  getMemberByEmail,
  getExampleData,
  saveMember,
  validateMemberData,
  type TeamMemberData,
  type ScheduleData,
} from "../../../services/googleSheets";
import { validateSchedule, type RuleViolation } from "@/rules/scheduleRules";
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

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const personId = decodeURIComponent(params?.personid as string);
  
  // Detecta telas menores que 768px (Mobile/Tablet Portrait)
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [memberData, setMemberData] = useState<TeamMemberData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [savedSchedule, setSavedSchedule] = useState<ScheduleData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewMember, setIsNewMember] = useState(false);
  const [isEditingFrentes, setIsEditingFrentes] = useState(false);
  const [editedFrentes, setEditedFrentes] = useState<string[]>([]);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesViolations, setRulesViolations] = useState<RuleViolation[]>([]);
  
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const FRENTES_OPTIONS = [
    "AI4Health", "AISE_Website", "Annotaise", "Diversity4SE", "EcoSustain",
    "EyesOnSmells", "IA4Law", "LLMs4SA", "ML4NFR", "ML4Smells", "ML4SPL",
    "SE4Finance", "SLR_ML4SPL", "SM&P", "StoneLab",
  ];

  const hp = memberData?.hp ? parseFloat(memberData.hp) : 0;
  const ho = memberData?.ho ? parseFloat(memberData.ho) : 0;

  useEffect(() => {
    document.title = `HORAISE | Editor`;
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    // Adiciona touchend para mobile
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, []);

  const cloneSchedule = (s: ScheduleData): ScheduleData => JSON.parse(JSON.stringify(s || {}));

  const statusToCode = (st: any): string => {
    switch (st) {
      case "aula": return "A";
      case "presencial": return "P";
      case "online": return "O";
      case "ocupado": return "X";
      case "reuniao": return "R";
      case "almoss": return "L";
      default: return "";
    }
  };

  const toCanonicalString = (s: ScheduleData): string => {
    const parts: string[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 7; hour <= 19; hour++) {
        const st = s?.[day]?.[hour] ?? null;
        parts.push(statusToCode(st));
      }
    }
    return parts.join("|");
  };

  const handleCellClick = (day: number, hour: number) => {
    setSchedule((prev) => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      if (!newSchedule[day]) newSchedule[day] = {};
      
      const currentStatus = newSchedule[day][hour];
      let nextStatus: string | null = null;

      if (activeTool) {
        if (currentStatus === activeTool) {
             nextStatus = null; 
        } else {
             nextStatus = activeTool; 
        }
      } 
      if (nextStatus) {
        newSchedule[day][hour] = nextStatus;
      } else {
        delete newSchedule[day][hour];
      }
      
      return newSchedule;
    });
  };
  
  const applyPaint = (day: number, hour: number) => {
    setSchedule((prev) => {
        const newSchedule = JSON.parse(JSON.stringify(prev));
        if (!newSchedule[day]) newSchedule[day] = {};
        if (activeTool) {
            newSchedule[day][hour] = activeTool;
        } else {

        }

        return newSchedule;
    });
  };

  const handleMouseDown = (day: number, hour: number, e: React.MouseEvent) => {
    e.preventDefault(); 
    setIsDragging(true);
    handleCellClick(day, hour);
  };

  const handleMouseEnter = (day: number, hour: number) => {
    if (isDragging && activeTool) {
         applyPaint(day, hour);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "presencial": return { color: "green", label: isMobile ? "P" : "Presencial" }; // Abrevia label no mobile
      case "online": return { color: "teal", label: isMobile ? "O" : "Online" };
      case "reuniao": return { color: "orange", label: isMobile ? "R" : "Reunião" };
      case "aula": return { color: "blue", label: isMobile ? "A" : "Aula" };
      case "ocupado": return { color: "red", label: isMobile ? "X" : "Ocupado" };
      case "almoss": return { color: "yellow", label: isMobile ? "L" : "Almoço" };
      default: return null;
    }
  };

  useEffect(() => {
    const loadMemberData = async () => {
      setIsLoading(true);
      try {
        if (typeof window !== "undefined") {
          const newMemberData = sessionStorage.getItem("newMember");
          const isNew = sessionStorage.getItem("isNewMember") === "true";

          if (isNew && newMemberData) {
            const member = JSON.parse(newMemberData) as TeamMemberData;
            setMemberData(member);
            const memberSchedule = member.schedule || {};
            setSchedule(memberSchedule);
            setSavedSchedule(cloneSchedule(memberSchedule));
            setIsNewMember(true);
            sessionStorage.removeItem("newMember");
            sessionStorage.removeItem("isNewMember");
            setIsLoading(false);
            return;
          }
        }

        const member = await getMemberByEmail(personId);
        if (member) {
          if (member.editor !== 1) {
            const isPending = member.pending === 1;
            const errorMsg = isPending
              ? "Seu cadastro está pendente de aprovação."
              : "Você não tem permissão para editar.";
            
            notifications.show({ title: "Acesso Negado", message: errorMsg, color: "red", icon: <IconLock />, autoClose: 5000 });
            setTimeout(() => router.push("/horaise-editor"), 2000);
            return;
          }
          setMemberData(member);
          const memberSchedule = member.schedule || {};
          setSchedule(memberSchedule);
          setSavedSchedule(cloneSchedule(memberSchedule));
          setIsNewMember(false);
        } else {
          const exampleData = await getExampleData();
          const newMember: TeamMemberData = { ...exampleData, email: personId };
          setMemberData(newMember);
          const exampleSchedule = newMember.schedule || {};
          setSchedule(exampleSchedule);
          setSavedSchedule(cloneSchedule(exampleSchedule));
          setIsNewMember(true);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        notifications.show({ title: "Erro", message: "Erro ao carregar dados.", color: "red" });
        setTimeout(() => router.push("/"), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    if (personId) loadMemberData();
  }, [personId, router]);

  const currentData = useMemo<TeamMemberData | null>(() => {
    if (!memberData) return null;
    return { ...memberData, schedule };
  }, [memberData, schedule]);

  const hasUnsavedChanges = useMemo(() => {
    return toCanonicalString(schedule) !== toCanonicalString(savedSchedule);
  }, [schedule, savedSchedule]);

  const validation = useMemo(() => {
    if (!currentData) return { valid: false, errors: ["Dados inválidos"] };
    return validateMemberData(currentData);
  }, [currentData]);

  const handleStartEditFrentes = () => {
    if (memberData?.frentes) {
      setEditedFrentes(memberData.frentes.split(",").map((f) => f.trim()).filter(Boolean));
      setIsEditingFrentes(true);
    }
  };

  const handleSaveFrentes = async () => {
    if (editedFrentes.length === 0) {
      notifications.show({ title: "Erro", message: "Selecione pelo menos uma frente", color: "red" });
      return;
    }
    if (!memberData) return;

    try {
      const updatedMember: TeamMemberData = { ...memberData, frentes: editedFrentes.join(", "), schedule };
      const result = await saveMember(updatedMember, false);

      if (result.success) {
        setMemberData(updatedMember);
        setIsEditingFrentes(false);
        notifications.show({ title: "Sucesso!", message: "Frentes atualizadas", color: "green", icon: <IconCheck /> });
      } else {
        notifications.show({ title: "Erro", message: result.message || "Erro ao atualizar", color: "red" });
      }
    } catch (error) {
      console.error("Erro ao salvar frentes:", error);
      notifications.show({ title: "Erro", message: "Erro ao atualizar frentes", color: "red" });
    }
  };

  const handleCancelEditFrentes = () => {
    setIsEditingFrentes(false);
    setEditedFrentes([]);
  };

  const handleReset = async () => {
    try {
      const exampleData = await getExampleData();
      const resetData: TeamMemberData = {
        ...exampleData,
        email: memberData?.email || personId, 
      };
      setMemberData(resetData);
      setSchedule(resetData.schedule || {});
      notifications.show({
        title: "Resetado",
        message: "Dados resetados para exemplo",
        color: "blue",
        icon: <IconRefresh />,
      });
    } catch (error) {
      console.error("Erro ao resetar:", error);
      notifications.show({ title: "Erro", message: "Erro ao carregar dados de exemplo", color: "red" });
    }
  };

  const handleSave = async () => {
    if (!currentData || !validation.valid) return false;

    const allViolations: RuleViolation[] = [];
    
    if (hp > 0 && ho > 0) {
      const scheduleArray: string[] = [];
      for (let day = 0; day <= 6; day++) {
        for (let hour = 7; hour <= 19; hour++) {
          const status = schedule?.[day]?.[hour];
          let code = "";
          if (status === "presencial") code = "P";
          else if (status === "online") code = "O";
          else if (status === "reuniao") code = "R";
          scheduleArray.push(code);
        }
      }
      
      const hoursValidation = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate-hours", scheduleRow: scheduleArray, hp, ho })
      }).then(res => res.json());
      
      if (!hoursValidation.isValid) {
        allViolations.push({ code: "weekday-lunch-11-14" as any, day: -1, message: `❌ ${hoursValidation.message}` });
      }
    }
    
    const scheduleResult = validateSchedule(schedule);
    if (!scheduleResult.ok) allViolations.push(...scheduleResult.violations);
    
    if (allViolations.length > 0) {
      setRulesViolations(allViolations);
      setRulesModalOpen(true);
      return false;
    }

    if (currentData.email === "exemplo@example.com") {
      notifications.show({ title: "Erro", message: "Não é possível salvar dados de exemplo.", color: "red" });
      return false;
    }

    setIsSaving(true);
    try {
      const result = await saveMember(currentData, isNewMember);
      if (result.success) {
        notifications.show({ title: "Sucesso!", message: "Dados salvos", color: "green", icon: <IconCheck /> });
        setMemberData(currentData); 
        setSavedSchedule(cloneSchedule(schedule)); 
        setIsNewMember(false);
        return true;
      } else {
        notifications.show({ title: "Erro", message: result.message, color: "red" });
        return false;
      }
    } catch (error) {
      notifications.show({ title: "Erro", message: "Erro ao salvar.", color: "red" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
      return undefined;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) setConfirmExitOpen(true);
    else router.push("/horaise-editor");
  };

  const hourCounts = useMemo(() => {
    const counts = { aula: 0, online: 0, presencial: 0, reuniao: 0 };
    if (schedule) {
      Object.values(schedule).forEach((daySlots: any) => {
        Object.values(daySlots).forEach((status: any) => {
          if (status === 'aula') counts.aula++;
          else if (status === 'online') counts.online++;
          else if (status === 'presencial') counts.presencial++;
          else if (status === 'reuniao') counts.reuniao++;
        });
      });
    }
    return counts;
  }, [schedule]);

  if (isLoading) {
    return (
      <Box style={{ minHeight: "100vh", background: "#F8F9FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size="xl" color="blue" />
      </Box>
    );
  }

  // --- Função para renderizar os botões de ferramentas (Ajustada para Mobile) ---
  const renderToolButton = (tool: string, label: string, icon: React.ReactNode, color: string, value: string | number) => {
    const isActive = activeTool === tool;
    
    // No mobile, o botão é menor e mais compacto
    return (
      <UnstyledButton
        onClick={() => setActiveTool(isActive ? null : tool)}
        style={{
          width: isMobile ? "auto" : "100%", // Mobile: largura auto para caber no scroll
          minWidth: isMobile ? "85px" : "auto", // Mobile: tamanho mínimo
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: isActive ? `var(--mantine-color-${color}-1)` : "white", // Mobile: fundo branco para contraste
          border: isActive ? `2px solid var(--mantine-color-${color}-6)` : "1px solid #eee",
          transition: "all 0.2s",
          flexShrink: 0, // Impede que o botão encolha no scroll horizontal
        }}
      >
        <Group gap="xs" w="100%" wrap="nowrap" justify={isMobile ? "center" : "flex-start"}>
          <ThemeIcon variant="light" color={color} size="sm">
            {icon}
          </ThemeIcon>
          <Stack gap={0} align={isMobile ? "center" : "flex-start"}>
             <Text size="xs" c={isActive ? color : "dimmed"} style={{ fontWeight: isActive ? 700 : 400, lineHeight: 1.1 }}>
                {label}
             </Text>
             {tool !== 'almoss' && tool !== 'ocupado' && (
                <Text size={isMobile ? "9px" : "xs"} c="dimmed" fw={600} style={{lineHeight: 1}}>
                    {value}h 
                </Text>
             )}
          </Stack>
        </Group>
      </UnstyledButton>
    );
  };

  const renderTools = () => (
    <>
        {renderToolButton("aula", "Aula", <IconSchool size={14} />, "blue", hourCounts.aula)}
        {renderToolButton("online", "Online", <IconDeviceLaptop size={14} />, "teal", `${hourCounts.online}/${ho}`)}
        {renderToolButton("presencial", "Presenc.", <IconBuildingSkyscraper size={14} />, "green", `${hourCounts.presencial}/${hp}`)}
        {renderToolButton("reuniao", "Reunião", <IconUsers size={14} />, "orange", hourCounts.reuniao)}
        {renderToolButton("almoss", "Almoço", <IconClock size={14} />, "yellow", 0)}
        {renderToolButton("ocupado", "Ocupado", <IconBan size={14} />, "red", 0)}
    </>
  );

  return (
    <>
      <TopNavBar />
      <Box style={{ minHeight: "100vh", background: "#F8F9FF", display: "flex", flexDirection: "column", paddingTop: isMobile ? "80px" : "140px", paddingBottom: "40px" }}>
        {/* Container fluido no mobile para aproveitar 100% da largura */}
        <Container size={isMobile ? "100%" : "96%"} style={{ width: "100%" }} px={isMobile ? "xs" : "md"}>
          
          <Grid gutter={isMobile ? 20 : 40}>
            {/* --- SEÇÃO LATERAL / SUPERIOR --- */}
            <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
              <Stack gap={isMobile ? "sm" : "xl"}>
                
                {/* Cabeçalho */}
                <Box ta="left">
                  {/* Título menor no mobile */}
                  <Title order={1} size={isMobile ? "h3" : "h1"} style={{ marginBottom: 4 , paddingTop: isMobile ? "40px" : "0px"}}>
                    <span style={{ background: "#0E1862", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 800 }}>HORAISE</span>{" "}
                    <span style={{ color: "#8EC9FC", fontWeight: 800 }}>EDITOR</span>
                  </Title>
                  <Text size="sm" c="dimmed">Edite sua disponibilidade e horários.</Text>
                </Box>

                {isNewMember && <Alert radius="md" variant="light" color="blue" title="Novo Perfil" icon={<IconAlertCircle />}>Dados de exemplo.</Alert>}

                <Stack gap={isMobile ? "xs" : "md"}>
                  <Paper p="sm" radius="md" withBorder shadow="sm">
                    <Group justify="space-between" align="center">
                        <Stack gap={0}>
                            <Text fw={700} size="md" c="#0E1862" truncate>{memberData?.name || personId}</Text>
                            <Text size="xs" c="dimmed" truncate style={{maxWidth: '200px'}}>{memberData?.email || personId}</Text>
                        </Stack>
                        <Badge variant="light" color={hasUnsavedChanges ? "orange" : "green"}>{hasUnsavedChanges ? "Não salvo" : "Salvo"}</Badge>
                    </Group>
                  </Paper>

                  {/* Frentes */}
                  <Box>
                    <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={600} c="#4A5568">Frentes:</Text>
                        {!isEditingFrentes && <ActionIcon variant="subtle" color="gray" onClick={handleStartEditFrentes} size="xs"><IconPencil size={14} /></ActionIcon>}
                    </Group>
                    {isEditingFrentes ? (
                        <Stack gap="sm">
                            <MultiSelect data={FRENTES_OPTIONS} value={editedFrentes} onChange={setEditedFrentes} searchable />
                            <Group gap="xs">
                                <Button size="xs" color="green" onClick={handleSaveFrentes}>Salvar</Button>
                                <Button size="xs" variant="default" onClick={handleCancelEditFrentes}>Cancelar</Button>
                            </Group>
                        </Stack>
                    ) : (
                        // No mobile, se tiver muitas frentes, usa scroll horizontal
                        isMobile ? (
                            <ScrollArea type="never" offsetScrollbars={false}>
                                <Group gap="xs" wrap="nowrap" pb={4}>
                                    {memberData?.frentes?.split(',').map(f => f.trim()).filter(Boolean).sort().map((frente, idx) => {
                                        const emoji = FRENTES_EMOJIS[frente] || "📌";
                                        return <Badge key={idx} size="sm" style={{ textTransform: "none", flexShrink: 0 }} styles={{ root: { backgroundColor: 'rgba(142, 201, 252, 0.2)', color: '#1A202C', border: 'none', fontWeight: 600 } }}>{emoji} {frente}</Badge>;
                                    })}
                                </Group>
                            </ScrollArea>
                        ) : (
                            <Group gap="xs">
                                {memberData?.frentes?.split(',').map(f => f.trim()).filter(Boolean).sort().map((frente, idx) => {
                                    const emoji = FRENTES_EMOJIS[frente] || "📌";
                                    return <Badge key={idx} size="sm" style={{ textTransform: "none" }} styles={{ root: { backgroundColor: 'rgba(142, 201, 252, 0.2)', color: '#1A202C', border: 'none', fontWeight: 600 } }}>{emoji} {frente}</Badge>;
                                })}
                            </Group>
                        )
                    )}
                  </Box>

                  {/* FERRAMENTAS - Layout Condicional */}
                  <Box mt={isMobile ? 0 : "xs"}>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600} style={{ textDecoration: 'underline', color: '#4A5568' }}>distribuição de horas:</Text>
                      {/* Botão de ajuda mantido */}
                      <HoverCard width={320} shadow="md" withArrow position="left">
                        <HoverCard.Target>
                          <ActionIcon variant="subtle" color="gray" size="sm">
                            <IconAlertTriangle size={16} /> 
                          </ActionIcon>
                        </HoverCard.Target>
                        <HoverCard.Dropdown>
                          {/* Conteúdo do tooltip igual */}
                          <Group gap="xs" mb="xs">
                            <ThemeIcon size="md" variant="light" color="blue"><IconAlertTriangle size={16} /></ThemeIcon>
                            <Text size="sm" fw={700} c="blue">Regras</Text>
                          </Group>
                          <List size="xs" spacing={4} type="ordered">
                            <List.Item>O horário de aulas deve refletir sua grade no SAU.</List.Item>
                            <List.Item>É obrigatório 1h de almoço entre 11h e 14h.</List.Item>
                            <List.Item>Pelo menos 4 slots diários em dias presenciais.</List.Item>
                            <List.Item>Mínimo aceitável: 2 slots consecutivos.</List.Item>
                          </List>
                        </HoverCard.Dropdown>
                      </HoverCard>
                    </Group>
                    
                    {!isMobile && <Text size="xs" c="dimmed" mb="xs">Clique em uma categoria abaixo para ativar o modo de pintura.</Text>}
                    
                    {isMobile ? (
                        // Mobile: Scroll Horizontal para ferramentas
                        <ScrollArea type="never" offsetScrollbars={false} mb="sm">
                            <Group gap="xs" wrap="nowrap" pb="xs">
                                {renderTools()}
                            </Group>
                        </ScrollArea>
                    ) : (
                        // Desktop: Grid Vertical
                        <SimpleGrid cols={1} spacing="xs" verticalSpacing="xs">
                            {renderTools()}
                        </SimpleGrid>
                    )}
                  </Box>

                </Stack>
              </Stack>
            </Grid.Col>

            {/* --- SEÇÃO DA TABELA --- */}
            <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
              <Stack gap="md">
                {/* ScrollArea para a tabela permitir rolagem horizontal no mobile */}
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
                            minWidth: isMobile ? "600px" : "100%" // Força largura mínima no mobile
                        }}
                        onMouseLeave={() => setIsDragging(false)} 
                    >
                        <Table.Thead bg="gray.1">
                        <Table.Tr>
                            <Table.Th style={{ width: "72px", textAlign: "center", height: ROW_HEIGHT }}>Horário</Table.Th>
                            {DAY_LABELS_SHORT.map((day) => (<Table.Th key={day} style={{ textAlign: "center", height: ROW_HEIGHT }}>{day}</Table.Th>))}
                        </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                        {HOURS_DISPLAY.map((hour) => (
                            <Table.Tr key={hour}>
                            <Table.Td style={{ fontWeight: 500, color: "#888", height: ROW_HEIGHT, fontSize: '12px' }}>{hour}:00</Table.Td>
                            {WEEKDAY_UI_INDICES.map((dayIndex) => {
                                const status = schedule?.[dayIndex]?.[hour];
                                const config = status ? getStatusConfig(status) : null;

                                return (
                                <Table.Td
                                    key={`${dayIndex}-${hour}`}
                                    p={0}
                                    style={{ cursor: "pointer", height: ROW_HEIGHT }}
                                    // Eventos de clique para Mobile (tap) e Desktop (drag)
                                    onClick={() => handleCellClick(dayIndex, hour)}
                                    onMouseDown={(e) => handleMouseDown(dayIndex, hour, e)}
                                    onMouseEnter={() => handleMouseEnter(dayIndex, hour)}
                                >
                                    {config ? (
                                        // No mobile, removemos o HoverCard para melhorar performance e usabilidade,
                                        // e mostramos apenas a letra ou cor
                                        isMobile ? (
                                            <Box w="100%" h="100%" bg={`${config.color}.1`} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `4px solid var(--mantine-color-${config.color}-6)` }}>
                                                <Text size="xs" c={`${config.color}.9`} fw={700}>{config.label}</Text>
                                            </Box>
                                        ) : (
                                            <HoverCard width={200} shadow="md" position="bottom" withArrow>
                                                <HoverCard.Target>
                                                <Box w="100%" h="100%" pl="sm" bg={`${config.color}.1`} style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", borderLeft: `5px solid var(--mantine-color-${config.color}-6)` }}>
                                                    <Text size="xs" c={`${config.color}.9`} fw={500} style={{ lineHeight: 1.2 }}>{config.label}</Text>
                                                </Box>
                                                </HoverCard.Target>
                                            </HoverCard>
                                        )
                                    ) : (
                                        <Box w="100%" h="100%" /> 
                                    )}
                                </Table.Td>
                                );
                            })}
                            </Table.Tr>
                        ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                <Group justify={isMobile ? "space-between" : "flex-end"} mt="md">
                    <Button leftSection={<IconRefresh size={18} />} variant="subtle" color="gray" onClick={handleReset} size={isMobile ? "xs" : "sm"}>Reset</Button>
                    <Button leftSection={<IconX size={18} />} variant="light" color="red" onClick={() => setSchedule({})} size={isMobile ? "xs" : "sm"}>Limpar</Button>
                    <Button leftSection={<IconDeviceFloppy size={18} />} color="green" onClick={handleSave} loading={isSaving} disabled={!hasUnsavedChanges && !isNewMember} size={isMobile ? "xs" : "sm"}>Salvar</Button>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>

          <Center mt="xl"><Text size="xs" c="dimmed" ta="center">© 2025 AISE Lab</Text></Center>
        </Container>

        <Modal opened={confirmExitOpen} onClose={() => setConfirmExitOpen(false)} title="Alterações não salvas" centered>
          <Text size="sm" mb="md">Deseja sair sem salvar?</Text>
          <Group justify="flex-end">
            <Button color="green" onClick={async () => { setConfirmExitOpen(false); const ok = await handleSave(); if (ok) router.push("/horaise-editor"); }}>Salvar e Sair</Button>
            <Button variant="light" color="red" onClick={() => { setConfirmExitOpen(false); router.push("/horaise-editor"); }}>Sair sem salvar</Button>
          </Group>
        </Modal>

        <Modal opened={rulesModalOpen} onClose={() => setRulesModalOpen(false)} title="Ajustes Necessários" centered size={isMobile ? "sm" : "lg"}>
          <Alert icon={<IconAlertCircle />} color="orange" mb="sm">Corrija os itens abaixo:</Alert>
          <Stack gap="xs" mb="md">{rulesViolations.map((v, idx) => <Text key={idx} size="sm">{v.message}</Text>)}</Stack>
          <Group justify="flex-end"><Button onClick={() => setRulesModalOpen(false)}>Ok</Button></Group>
        </Modal>
      </Box>
    </>
  );
}