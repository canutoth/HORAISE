"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Text,
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
  Select,
  SimpleGrid,
  ScrollArea,
  MultiSelect,
  NumberInput,
  Paper,
  ActionIcon,
  UnstyledButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconSchool,
  IconDeviceLaptop,
  IconBuildingSkyscraper,
  IconUsers,
  IconToolsKitchen2,
  IconPencil,
  IconDeviceFloppy,
  IconCheck,
  IconBan,
  IconX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

const WEEKDAY_UI_INDICES = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS_DISPLAY = Array.from({ length: 13 }, (_, i) => i + 7);
const ROW_HEIGHT = "40px";

type ScheduleData = {
  [day: number]: {
    [hour: number]: string;
  };
};

type AdminSuggestionPanelProps = {
  frentesOptions: { value: string; label: string }[];
  bolsasOptions: { value: string; label: string; color: string }[];
  initialTargetEmail?: string;
  onSavedSchedule?: () => void;
};

export function AdminSuggestionPanel({ 
  frentesOptions, 
  bolsasOptions,
  initialTargetEmail,
  onSavedSchedule,
}: AdminSuggestionPanelProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string>("");
  const [frentesEmojis, setFrentesEmojis] = useState<Record<string, string>>({});
  const [bolsasColors, setBolsasColors] = useState<Record<string, string>>({});
  
  // Estados de edição de dados
  const [isEditingData, setIsEditingData] = useState(false);
  const [editedFrentes, setEditedFrentes] = useState<string[]>([]);
  const [editedBolsas, setEditedBolsas] = useState<string[]>([]);
  const [editedHP, setEditedHP] = useState(0);
  const [editedHO, setEditedHO] = useState(0);
  
  // Estados de edição de horário
  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const isAdminMode = true; // Este painel só é usado por admins
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "read-backlog-options" }),
        });
        const data = await response.json();

        if (response.ok) {
          const emojiMap: Record<string, string> = {};
          (data.frentes || []).forEach((f: any) => {
            emojiMap[f.name] = f.emoji;
          });
          setFrentesEmojis(emojiMap);

          const colorMap: Record<string, string> = {};
          (data.bolsas || []).forEach((b: any) => {
            colorMap[b.name] = b.color;
          });
          setBolsasColors(colorMap);
        }
      } catch (error) {
        console.error("Erro ao carregar opções:", error);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);
        
        // Verificar se o admin está logado
        const adminEmailCheck = sessionStorage.getItem("adminEmail");
        
        if (!adminEmailCheck) {
          setError("Admin não autenticado. Por favor, faça login novamente.");
          return;
        }
        
        const response = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "read-all-members" }),
        });
        const data = await response.json();

        if (response.ok && data.members && data.members.length > 0) {
          const headerRow = data.members[0];
          const columnMapping = new Map<string, number>();
          headerRow.forEach((header: string, index: number) => {
            const normalizedHeader = header?.trim();
            if (normalizedHeader) {
              columnMapping.set(normalizedHeader, index);
            }
          });

          const getColumnValue = (row: any[], columnName: string): any => {
            const index = columnMapping.get(columnName);
            return index !== undefined ? row[index] : "";
          };

          const mappedMembers = data.members
            .slice(1)
            .map((row: any) => {
              const name = getColumnValue(row, "Nome");
              const email = getColumnValue(row, "Email");
              const frentes = getColumnValue(row, "Frentes");
              const bolsa = getColumnValue(row, "Bolsa");
              const hp = parseInt(getColumnValue(row, "HP")) || 0;
              const ho = parseInt(getColumnValue(row, "HO")) || 0;

              // Parsear schedule
              const schedule: any = {};
              const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
              
              for (let day = 0; day < 7; day++) {
                schedule[day] = {};
                const dayName = dayNames[day];
                
                for (let hour = 7; hour < 20; hour++) {
                  // Formato correto: "Seg7-8", "Ter8-9", etc.
                  const colName = `${dayName}${hour}-${hour + 1}`;
                  const value = getColumnValue(row, colName);
                  
                  if (value === "P") schedule[day][hour] = "presencial";
                  else if (value === "O") schedule[day][hour] = "online";
                  else if (value === "R") schedule[day][hour] = "reuniao";
                  else if (value === "A") schedule[day][hour] = "aula";
                  else if (value === "L") schedule[day][hour] = "almoco";
                  else if (value === "X") schedule[day][hour] = "ocupado";
                }
              }

              return { name, email, frentes, bolsa, hp, ho, schedule };
            })
            .filter((m: any) => m.email && m.name);

          const sorted = mappedMembers.sort((a: any, b: any) => a.name.localeCompare(b.name));
          setMembers(sorted);
        }
      } catch (e) {
        console.error("Erro carregando membros:", e);
        setError("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, []);

  const current = useMemo(() => (members.length > 0 ? members[currentIndex] : null), [members, currentIndex]);

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

  useEffect(() => {
    if (current) {
      setEditedFrentes(
        current.frentes ? current.frentes.split(',').map((f: string) => f.trim()).filter(Boolean) : []
      );
      setEditedBolsas(
        current.bolsa && current.bolsa !== "nan" && current.bolsa.trim() !== ''
          ? current.bolsa.split(',').map((b: string) => b.trim()).filter(Boolean)
          : []
      );
      setEditedHP(current.hp || 0);
      setEditedHO(current.ho || 0);
      
      const copiedSchedule = JSON.parse(JSON.stringify(current.schedule || {}));
      setSchedule(copiedSchedule);
      setIsEditingData(false);
    }
  }, [current]);

  useEffect(() => {
    if (!initialTargetEmail || members.length === 0) return;

    const targetIndex = members.findIndex(
      (member) => member.email?.toLowerCase() === initialTargetEmail.toLowerCase()
    );

    if (targetIndex >= 0 && targetIndex !== currentIndex) {
      setCurrentIndex(targetIndex);
    }
  }, [initialTargetEmail, members, currentIndex]);

  const handleSaveDataEdits = async () => {
    if (!current) return;

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-member-data",
          email: current.email,
          frentes: editedFrentes.join(", "),
          bolsa: editedBolsas.join(", "),
          hp: editedHP,
          ho: editedHO,
        }),
      });

      if (response.ok) {
        notifications.show({
          title: "Sucesso",
          message: "Dados atualizados com sucesso",
          color: "green",
          icon: <IconDeviceFloppy />,
        });

        setMembers(prev => prev.map(m => 
          m.email === current.email
            ? { ...m, frentes: editedFrentes.join(", "), bolsa: editedBolsas.join(", "), hp: editedHP, ho: editedHO }
            : m
        ));

        setIsEditingData(false);
      } else {
        const data = await response.json();
        notifications.show({
          title: "Erro",
          message: data.error || "Erro ao atualizar dados",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      notifications.show({
        title: "Erro",
        message: "Erro ao salvar alterações",
        color: "red",
      });
    }
  };

  const handleSaveSuggestion = async () => {
    if (!current) {
      notifications.show({
        title: "Erro",
        message: "Nenhum membro selecionado",
        color: "red",
      });
      return;
    }

    const currentAdminEmail = typeof window !== 'undefined' ? sessionStorage.getItem("adminEmail") : null;
    
    if (!currentAdminEmail) {
      notifications.show({
        title: "Erro",
        message: "Email do administrador não encontrado. Faça login novamente.",
        color: "red",
      });
      return;
    }

    setSaving(true);
    try {
      // Converter schedule para array de 91 posições
      const scheduleArray: string[] = [];
      for (let day = 0; day <= 6; day++) {
        for (let hour = 7; hour <= 19; hour++) {
          const status = schedule?.[day]?.[hour];
          let code = "";
          if (status === "presencial") code = "P";
          else if (status === "online") code = "O";
          else if (status === "reuniao") code = "R";
          else if (status === "aula") code = "A";
          else if (status === "ocupado") code = "X";
          else if (status === "almoco") code = "L";
          scheduleArray.push(code);
        }
      }

      console.log("Enviando sugestão:", {
        adminEmail: currentAdminEmail,
        targetEmail: current.email,
        scheduleLength: scheduleArray.length,
        scheduleArray: scheduleArray
      });

      if (scheduleArray.length !== 91) {
        console.error("ERRO: scheduleArray deveria ter 91 elementos mas tem", scheduleArray.length);
        notifications.show({
          title: "Erro de Validação",
          message: `Array de schedule inválido: ${scheduleArray.length} elementos ao invés de 91`,
          color: "red",
        });
        return;
      }

      const response = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-suggested-schedule",
          adminEmail: currentAdminEmail,
          targetEmail: current.email,
          scheduleRow: scheduleArray,
        }),
      });

      const result = await response.json();
      console.log("Resposta da API:", result);

      if (result.success) {
        notifications.show({
          title: "Horário Definido!",
          message: `Horário de ${current.name} foi salvo. O membro foi notificado por email.`,
          color: "green",
          icon: <IconCheck />,
          autoClose: 5000,
        });
        onSavedSchedule?.();
      } else {
        notifications.show({
          title: "Erro",
          message: result.message || "Erro ao enviar sugestão",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar sugestão:", error);
      notifications.show({
        title: "Erro",
        message: error instanceof Error ? error.message : "Erro ao enviar sugestão",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
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
      case "presencial": return { color: "green", label: "Presencial", short: "P" };
      case "online": return { color: "teal", label: "Online", short: "O" };
      case "reuniao": return { color: "orange", label: "Reunião", short: "R" };
      case "aula": return { color: "blue", label: "Aula", short: "A" };
      case "almoco": return { color: "yellow", label: "Almoço", short: "L" };
      case "ocupado": return { color: "red", label: "Ocupado", short: "X" };
      default: return null;
    }
  };

  const renderToolButton = (tool: string, label: string, icon: React.ReactNode, color: string) => {
    const isActive = activeTool === tool;
    const count = tool === 'aula' ? hourCounts.aula :
                  tool === 'online' ? hourCounts.online :
                  tool === 'presencial' ? hourCounts.presencial :
                  tool === 'reuniao' ? hourCounts.reuniao :
                  tool === 'almoco' ? hourCounts.almoco : 0;
    
    return (
      <UnstyledButton
        onClick={() => setActiveTool(isActive ? null : tool)}
        style={{
          width: isMobile ? "auto" : "100%",
          minWidth: isMobile ? "85px" : "auto",
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: isActive ? `var(--mantine-color-${color}-1)` : "white",
          border: isActive ? `2px solid var(--mantine-color-${color}-6)` : "1px solid #eee",
          transition: "all 0.2s",
          flexShrink: 0,
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
            {tool !== 'ocupado' && (
              <Text size={isMobile ? "9px" : "xs"} c="dimmed" fw={600} style={{ lineHeight: 1 }}>
                {count}h
              </Text>
            )}
          </Stack>
        </Group>
      </UnstyledButton>
    );
  };

  const renderTools = () => (
    <>
      {renderToolButton("aula", "Aula", <IconSchool size={14} />, "blue")}
      {renderToolButton("online", "Online", <IconDeviceLaptop size={14} />, "teal")}
      {renderToolButton("presencial", "Presenc.", <IconBuildingSkyscraper size={14} />, "green")}
      {renderToolButton("reuniao", "Reunião", <IconUsers size={14} />, "orange")}
      {renderToolButton("almoco", "Almoço", <IconToolsKitchen2 size={14} />, "yellow")}
      {renderToolButton("ocupado", "Ocupado", <IconBan size={14} />, "red")}
    </>
  );

  const hourCounts = useMemo(() => {
    const counts = { aula: 0, online: 0, presencial: 0, reuniao: 0, almoco: 0 };
    if (schedule) {
      Object.values(schedule).forEach((daySlots: any) => {
        Object.values(daySlots).forEach((status: any) => {
          if (status === 'aula') counts.aula++;
          else if (status === 'online') counts.online++;
          else if (status === 'presencial') counts.presencial++;
          else if (status === 'reuniao') counts.reuniao++;
          else if (status === 'almoco') counts.almoco++;
        });
      });
    }
    return counts;
  }, [schedule]);

  if (loading) {
    return <Center py="xl"><Loader color="blue" /></Center>;
  }

  if (error) {
    return <Alert icon={<IconAlertCircle size={18} />} title="Erro" color="red" variant="light">{error}</Alert>;
  }

  if (!current) {
    return <Center py="xl"><Text c="dimmed">Nenhum membro disponível</Text></Center>;
  }

  return (
    <Grid gutter={isMobile ? 20 : 40}>
      {/* Sidebar esquerda */}
      <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
        <Stack gap={isMobile ? "sm" : "md"}>
          <Select
            label="Selecionar membro"
            placeholder="Busque por nome"
            searchable
            data={members.map((m, idx) => ({ value: idx.toString(), label: m.name }))}
            value={currentIndex.toString()}
            onChange={(val) => { if (val !== null) setCurrentIndex(parseInt(val)); }}
            styles={{ label: { color: "var(--primary)", fontWeight: 600, marginBottom: 4 } }}
          />

          <Paper shadow="sm" p="sm" radius="md" withBorder>
            <Group justify="space-between" align="center" mb="xs">
              <Stack gap={0}>
                <Group gap="sm" align="center" wrap="wrap" mb={2}>
                  <Text fw={700} size="md" c="#0E1862" truncate>{current.name}</Text>
                  {editedBolsas.map((bolsaItem: string, idx: number) => (
                    <Badge
                      key={idx}
                      size="xs"
                      variant="light"
                      color={bolsasColors[bolsaItem] || "blue"}
                      style={{ textTransform: "none", fontWeight: 700 }}
                    >
                      {bolsaItem}
                    </Badge>
                  ))}
                </Group>
                <Text size="xs" c="dimmed" truncate style={{ maxWidth: '200px' }}>{current.email}</Text>
              </Stack>
            </Group>
          </Paper>

          {/* Frentes */}
          <Box>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600} c="#4A5568">Frentes:</Text>
              {!isEditingData && (
                <ActionIcon variant="subtle" color="gray" onClick={() => setIsEditingData(true)} size="xs">
                  <IconPencil size={14} />
                </ActionIcon>
              )}
            </Group>
            {isEditingData ? (
              <Stack gap="sm">
                <MultiSelect
                  data={frentesOptions}
                  value={editedFrentes}
                  onChange={setEditedFrentes}
                  searchable
                  size="xs"
                />
                <MultiSelect
                  label="Bolsa(s)"
                  data={bolsasOptions}
                  value={editedBolsas}
                  onChange={setEditedBolsas}
                  clearable
                  size="xs"
                />
                <Group grow>
                  <NumberInput
                    label="H. Online"
                    size="xs"
                    value={editedHO}
                    onChange={(val) => setEditedHO(Number(val) || 0)}
                    min={0}
                  />
                  <NumberInput
                    label="H. Pres."
                    size="xs"
                    value={editedHP}
                    onChange={(val) => setEditedHP(Number(val) || 0)}
                    min={0}
                  />
                </Group>
                <Group gap="xs">
                  <Button size="xs" color="green" onClick={handleSaveDataEdits}>Salvar</Button>
                  <Button size="xs" variant="default" onClick={() => {
                    setIsEditingData(false);
                    setEditedFrentes(current.frentes ? current.frentes.split(',').map((f: string) => f.trim()).filter(Boolean) : []);
                    setEditedBolsas(current.bolsa && current.bolsa !== "nan" && current.bolsa.trim() !== '' ? current.bolsa.split(',').map((b: string) => b.trim()).filter(Boolean) : []);
                    setEditedHP(current.hp || 0);
                    setEditedHO(current.ho || 0);
                  }}>Cancelar</Button>
                </Group>
              </Stack>
            ) : (
              isMobile ? (
                <ScrollArea type="never" offsetScrollbars={false}>
                  <Group gap="xs" wrap="nowrap" pb={4}>
                    {editedFrentes.sort().map((frente, idx) => {
                      const emoji = frentesEmojis[frente] || "📌";
                      return (
                        <Badge
                          key={idx}
                          size="sm"
                          style={{ textTransform: "none", flexShrink: 0 }}
                          styles={{ root: { backgroundColor: 'rgba(142, 201, 252, 0.2)', color: '#1A202C', border: 'none', fontWeight: 600 } }}
                        >
                          {emoji} {frente}
                        </Badge>
                      );
                    })}
                  </Group>
                </ScrollArea>
              ) : (
                <Group gap="xs">
                  {editedFrentes.sort().map((frente, idx) => {
                    const emoji = frentesEmojis[frente] || "📌";
                    return (
                      <Badge
                        key={idx}
                        size="sm"
                        style={{ textTransform: "none" }}
                        styles={{ root: { backgroundColor: 'rgba(142, 201, 252, 0.2)', color: '#1A202C', border: 'none', fontWeight: 600 } }}
                      >
                        {emoji} {frente}
                      </Badge>
                    );
                  })}
                </Group>
              )
            )}
          </Box>

          {/* Ferramentas de pintura */}
          <Box mt={isMobile ? 0 : "xs"}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={600} style={{color: '#4A5568' }}>
                Distribuição de horas:
              </Text>
            </Group>

            {!isMobile && <Text size="xs" c="dimmed" mb="xs">Clique em uma categoria abaixo para ativar o modo de pintura.</Text>}

            {isMobile ? (
              <ScrollArea type="never" offsetScrollbars={false} mb="sm">
                <Group gap="xs" wrap="nowrap" pb="xs">
                  {renderTools()}
                </Group>
              </ScrollArea>
            ) : (
              <SimpleGrid cols={1} spacing="xs" verticalSpacing="xs">
                {renderTools()}
              </SimpleGrid>
            )}
          </Box>
        </Stack>
      </Grid.Col>

      {/* Conteúdo principal */}
      <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
        <Stack gap="md">
          {isAdminMode && (
            <Alert radius="md" variant="light" color="orange" title="👨‍💼 Modo Administrador" icon={<IconAlertCircle />}>
              Você está definindo o horário de trabalho de <strong>{current.name}</strong>.
            </Alert>
          )}

          {/* Tabela editável */}
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
                minWidth: isMobile ? "600px" : "100%",
                userSelect: "none",
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
                    <Table.Td style={{ fontWeight: 500, color: "#888", height: ROW_HEIGHT, fontSize: '12px' }}>{hour}-{hour+1}h</Table.Td>
                    {WEEKDAY_UI_INDICES.map((dayIndex) => {
                      const status = schedule?.[dayIndex]?.[hour];
                      const config = status ? getStatusConfig(status) : null;

                      return (
                        <Table.Td
                          key={`${dayIndex}-${hour}`}
                          p={0}
                          style={{ cursor: "pointer", height: ROW_HEIGHT }}
                          onClick={() => handleCellClick(dayIndex, hour)}
                          onMouseDown={(e) => handleMouseDown(dayIndex, hour, e)}
                          onMouseEnter={() => handleMouseEnter(dayIndex, hour)}
                        >
                          {config ? (
                            isMobile ? (
                              <Box w="100%" h="100%" bg={`${config.color}.1`} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `4px solid var(--mantine-color-${config.color}-6)` }}>
                                <Text size="xs" c={`${config.color}.9`} fw={700}>{config.short}</Text>
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

          {/* Botões de ação */}
          <Group justify={isMobile ? "space-between" : "flex-end"} mt="md">
            <Button
              leftSection={<IconX size={18} />}
              variant="light"
              color="red"
              onClick={() => setSchedule({})}
              size={isMobile ? "xs" : "sm"}
            >
              Limpar
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              color="green"
              onClick={handleSaveSuggestion}
              loading={saving}
              size={isMobile ? "xs" : "sm"}
            >
              Salvar Horário
            </Button>
          </Group>

          {/* Navegação de membros */}
          <Box>
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
      </Grid.Col>
    </Grid>
  );
}
