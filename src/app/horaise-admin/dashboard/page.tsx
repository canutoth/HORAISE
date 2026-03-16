"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Container,
  Title,
  Text,
  Button,
  Paper,
  Group,
  Loader,
  Center,
  Tabs,
  Badge,
  Table,
  ActionIcon,
  Stack,
  Tooltip,
  Popover,
  NumberInput,
  MultiSelect,
  Select,
  Modal,
  ThemeIcon,
  rem,
} from "@mantine/core";
import {
  IconLogout,
  IconCheck,
  IconX,
  IconUser,
  IconClock,
  IconLockOpen,
  IconLock,
  IconRefresh,
  IconEye,
  IconPencil,
  IconDeviceFloppy,
  IconAlertCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import { AdminSuggestionPanel } from "@/components/AdminSuggestionPanel";
import { notifications } from "@mantine/notifications";
import { useMediaQuery } from "@mantine/hooks"; 
import { getBacklogOptions } from "../../../services/googleSheets";
// 🎯 Easter egg: Normaliza o nome do Coutinho
const normalizeCoutinho = (name: string, email: string): string => {
  const nameLower = name.toLowerCase().trim();
  const emailLower = email.toLowerCase().trim();
  
  if (
    nameLower === "daniel coutinho" ||
    emailLower === "dcoutinho@inf.puc-rio.br" ||
    emailLower === "danieljosebc@gmail.com"
  ) {
    return "Coutinho";
  }
  
  return name;
};

type AdminMember = {
  name: string;
  email: string;
  frentes: string;
  bolsa: string;
  editor: number;
  pendingAccess: number;
  pendingTimeTable: number;
  hp: number;
  ho: number;
  rowNumber: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [frentesOptions, setFrentesOptions] = useState<{ value: string; label: string }[]>([]);
  const [bolsasOptions, setBolsasOptions] = useState<{ value: string; label: string; color: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string>("cadastros");
  
  // Estado para armazenar edições pendentes (não salvas na planilha ainda)
  const [pendingEdits, setPendingEdits] = useState<Record<string, {
    frentes: string;
    bolsa: string;
    hp: number;
    ho: number;
  }>>({});

  // Pendentes (editor !== 1) aparecem primeiro e depois ordem alfabética
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aIsPending = a.editor !== 1;
      const bIsPending = b.editor !== 1;

      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [members]);

  const [confirmationModal, setConfirmationModal] = useState<{
    type: 'approve' | 'revoke' | null;
    email: string;
    name: string;
  }>({ type: null, email: '', name: '' });

  // Componente interno para ter acesso aos estados
  const EditMemberPopover = ({ 
    member
  }: { 
    member: AdminMember;
  }) => {
    const [opened, setOpened] = useState(false);
    
    // Inicializa com os dados pendentes se existirem, senão usa os do membro
    const pendingData = pendingEdits[member.email];
    const [frentesSelecionadas, setFrentesSelecionadas] = useState<string[]>(
      pendingData?.frentes 
        ? pendingData.frentes.split(",").map((s) => s.trim()).filter(Boolean)
        : member.frentes ? member.frentes.split(",").map((s) => s.trim()).filter(Boolean) : []
    );
    
    const [bolsasSelecionadas, setBolsasSelecionadas] = useState<string[]>(
      pendingData?.bolsa && pendingData.bolsa !== "nan" && pendingData.bolsa.trim() !== ''
        ? pendingData.bolsa.split(",").map((s) => s.trim()).filter(Boolean)
        : member.bolsa && member.bolsa !== "nan" && member.bolsa.trim() !== '' 
          ? member.bolsa.split(",").map((s) => s.trim()).filter(Boolean) 
          : []
    );

    const [hours, setHours] = useState({
      hp: pendingData?.hp ?? member.hp,
      ho: pendingData?.ho ?? member.ho,
    });

    const handleSave = () => {
      // Salva apenas no estado local (não envia para planilha)
      setPendingEdits(prev => ({
        ...prev,
        [member.email]: {
          frentes: frentesSelecionadas.join(", "),
          bolsa: bolsasSelecionadas.join(", "),
          hp: hours.hp,
          ho: hours.ho,
        }
      }));
      setOpened(false);
      notifications.show({ 
        title: "Salvo localmente", 
        message: "Clique no ✓ para confirmar o cadastro", 
        color: "blue" 
      });
    };

    return (
      <Popover 
        opened={opened} 
        onChange={setOpened} 
        width={300} 
        position="bottom-end" 
        withArrow 
        shadow="md"
        closeOnClickOutside={false}
        closeOnEscape={true}
      >
        <Popover.Target>
          <ActionIcon 
            variant="light" 
            color="blue" 
            size="lg"
            onClick={() => setOpened((o) => !o)}
          >
            <IconPencil size={20} />
          </ActionIcon>
        </Popover.Target>

        <Popover.Dropdown>
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={700} c="dimmed">Editar Dados</Text>
              <ActionIcon 
                variant="subtle" 
                color="gray" 
                size="sm"
                onClick={() => setOpened(false)}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
            
            <MultiSelect
              label="Frente(s)"
              size="xs"
              placeholder="Selecione"
              data={frentesOptions}
              value={frentesSelecionadas}
              onChange={setFrentesSelecionadas}
              hidePickedOptions
            />
            
            <MultiSelect
              label="Bolsa(s)"
              size="xs"
              placeholder="Selecione (opcional)"
              data={bolsasOptions}
              value={bolsasSelecionadas}
              onChange={setBolsasSelecionadas}
              hidePickedOptions
              clearable
            />

            <Group grow>
              <NumberInput
                label="H. Online"
                size="xs"
                value={hours.ho}
                onChange={(val) => setHours({ ...hours, ho: Number(val) || 0 })}
                min={0}
              />
              <NumberInput
                label="H. Pres."
                size="xs"
                value={hours.hp}
                onChange={(val) => setHours({ ...hours, hp: Number(val) || 0 })}
                min={0}
              />
            </Group>

            <Button 
              fullWidth 
              size="xs" 
              color="blue" 
              mt="xs" 
              leftSection={<IconDeviceFloppy size={14} />}
              onClick={handleSave}
            >
              Salvar
            </Button>
          </Stack>
        </Popover.Dropdown>
      </Popover>
    );
  };

  const fetchBacklogOptions = async () => {
    try {
      const data = await getBacklogOptions();

      const frentesWithEmojis = (data.frentes || []).map((frente: { name: string; emoji: string }) => ({
        value: frente.name,
        label: `${frente.emoji} ${frente.name}`,
      }));
      setFrentesOptions(frentesWithEmojis);

      const bolsasWithColors = (data.bolsas || []).map((bolsa: { name: string; color: string }) => ({
        value: bolsa.name,
        label: bolsa.name,
        color: bolsa.color,
      }));
      setBolsasOptions(bolsasWithColors);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    }
  };

  const fetchMembers = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all-members" }),
      });
      const data = await response.json();
      
      if (response.ok && data.members && data.members.length > 0) {
        // Primeira linha é o cabeçalho, usa para criar o mapeamento
        const headerRow = data.members[0];
        const columnMapping = new Map<string, number>();
        headerRow.forEach((header: string, index: number) => {
          const normalizedHeader = header?.trim();
          if (normalizedHeader) {
            columnMapping.set(normalizedHeader, index);
          }
        });
        
        // Helper para obter valor de coluna pelo nome
        const getColumnValue = (row: any[], columnName: string): any => {
          const index = columnMapping.get(columnName);
          return index !== undefined ? row[index] : "";
        };
        
        // Mapeia os dados (pula a primeira linha que é o cabeçalho)
        const mappedMembers = data.members
          .slice(1)
          .map((row: any, index: number) => ({
            name: normalizeCoutinho(getColumnValue(row, "Nome"), getColumnValue(row, "Email")),
            email: getColumnValue(row, "Email"),
            frentes: getColumnValue(row, "Frentes"),
            bolsa: getColumnValue(row, "Bolsa"),
            editor: Number(getColumnValue(row, "Editor") || 0),
            pendingAccess: Number(getColumnValue(row, "Pending-Access") || 0),
            pendingTimeTable: Number(getColumnValue(row, "Pending-TimeTable") || 0),
            hp: Number(getColumnValue(row, "HP") || 0),
            ho: Number(getColumnValue(row, "HO") || 0),
            rowNumber: index + 2,
          }))
          // Filtra linhas vazias (sem email válido)
          .filter((member: any) => member.email && member.email.trim() !== "");
        setMembers(mappedMembers);
      }
    } catch (error) {
      console.error(error);
      notifications.show({ title: "Erro", message: "Falha ao carregar membros", color: "red" });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar se o admin está logado
    const adminEmail = sessionStorage.getItem("adminEmail");
    if (!adminEmail) {
      notifications.show({
        title: "Acesso Negado",
        message: "Por favor, faça login como administrador",
        color: "red",
      });
      router.push("/horaise-admin");
      return;
    }

    fetchBacklogOptions();
    fetchMembers();
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "cadastros" || tab === "horarios" || tab === "acessos" || tab === "sugerir") {
      setActiveTab(tab);
      return;
    }
    setActiveTab("cadastros");
  }, [searchParams]);

  const handleOpenDefineSchedule = (email: string) => {
    const params = new URLSearchParams();
    params.set("tab", "sugerir");
    params.set("personid", email);
    router.push(`/horaise-admin/dashboard?${params.toString()}`);
  };

  const handleSimpleAction = async (email: string, actionType: string) => {
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionType, email }),
      });
      
      if (response.ok) {
        notifications.show({ title: "Sucesso", message: "Ação realizada!", color: "green" });
        fetchMembers(); 
      } else {
        notifications.show({ title: "Erro", message: "Falha na operação", color: "red" });
      }
    } catch (e) {
      notifications.show({ title: "Erro", message: "Erro de conexão", color: "red" });
    }
  };

  const handleConfirmModal = async () => {
    if (!confirmationModal.type || !confirmationModal.email) return;

    const action = confirmationModal.type === 'approve' 
      ? 'approve-registration' 
      : 'revoke-editor';

    await handleSimpleAction(confirmationModal.email, action);
    setConfirmationModal({ type: null, email: '', name: '' });
  };

  // Confirmar cadastro pendente (envia para planilha)
  const handleConfirmRegistration = async (member: AdminMember) => {
    const editData = pendingEdits[member.email];
    
    // Se não há edições pendentes, valida os dados atuais do membro
    if (!editData) {
      const hasBothHoursZero = member.ho === 0 && member.hp === 0;
      const hasMissingBolsa = !member.bolsa || member.bolsa === 'nan' || member.bolsa.trim() === '';
      
      if (hasBothHoursZero || hasMissingBolsa) {
        notifications.show({ 
          title: "Dados incompletos", 
          message: hasBothHoursZero ? "Defina ao menos HO ou HP (não ambos zerados)" : "Preencha a bolsa antes de confirmar", 
          color: "orange" 
        });
        return;
      }
    } else {
      // Se há edições pendentes, valida os dados editados
      const hasBothHoursZero = editData.ho === 0 && editData.hp === 0;
      const hasMissingBolsa = !editData.bolsa || editData.bolsa === 'nan' || editData.bolsa.trim() === '';
      
      if (hasBothHoursZero || hasMissingBolsa) {
        notifications.show({ 
          title: "Dados incompletos", 
          message: hasBothHoursZero ? "Defina ao menos HO ou HP (não ambos zerados)" : "Preencha a bolsa antes de confirmar", 
          color: "orange" 
        });
        return;
      }
    }
    
    const dataToSend = editData || {
      frentes: member.frentes,
      bolsa: member.bolsa,
      hp: member.hp,
      ho: member.ho,
    };
    
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "update-member-data",
          email: member.email,
          frentes: dataToSend.frentes,
          bolsa: dataToSend.bolsa,
          hp: dataToSend.hp,
          ho: dataToSend.ho,
        }),
      });

      const resJson = await response.json();
      
      if (response.ok) {
        notifications.show({ title: "Sucesso", message: "Cadastro aprovado e acesso liberado!", color: "green" });
        // Remove do estado de edições pendentes
        setPendingEdits(prev => {
          const newState = { ...prev };
          delete newState[member.email];
          return newState;
        });
        fetchMembers();
      } else {
        notifications.show({ title: "Erro", message: resJson.error || "Falha ao salvar", color: "red" });
      }
    } catch (error) {
      console.error(error);
      notifications.show({ title: "Erro", message: "Erro de conexão", color: "red" });
    }
  };

  // salvar edicao
  const handleUpdateData = async (data: any) => {
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "update-member-data",
          email: data.email,
          frentes: data.frentes,
          bolsa: data.bolsa,
          hp: data.hp,
          ho: data.ho,
        }),
      });

      const resJson = await response.json();
      
      if (response.ok) {
        notifications.show({ title: "Salvo", message: "Cadastro aprovado e acesso liberado!", color: "green" });
        fetchMembers();
      } else {
        notifications.show({ title: "Erro", message: resJson.error || "Falha ao salvar", color: "red" });
      }
    } catch (error) {
      console.error(error);
      notifications.show({ title: "Erro", message: "Erro de conexão", color: "red" });
    }
  };

  const handleLogout = () => {
    router.push("/horaise-admin");
  };

  // Cadastro pendente = (HP E HO ambos zerados) OU sem bolsa definida
  const pendingRegistrations = sortedMembers.filter(m => {
    const hasBothHoursZero = m.ho === 0 && m.hp === 0;
    const hasMissingBolsa = !m.bolsa || m.bolsa === 'nan' || m.bolsa.trim() === '';
    return hasBothHoursZero || hasMissingBolsa;
  });
  
  const pendingSchedules = sortedMembers.filter(m => m.pendingTimeTable === 1 || m.pendingTimeTable === 2);
  
  // Acessos de Edição = Apenas pessoas COM todos os dados preenchidos (HP+HO > 0, Bolsa)
  const activeEditors = sortedMembers.filter(m => {
    const hasValidHours = (m.ho > 0 || m.hp > 0);
    const hasAllData = hasValidHours && m.bolsa && m.bolsa !== 'nan' && m.bolsa.trim() !== '';
    return hasAllData && (m.pendingAccess === 1 || m.editor === 1);
  });

  const MemberTable = ({ data, type }: { data: AdminMember[], type: 'registration' | 'schedule' | 'access' }) => (
    <Table.ScrollContainer minWidth={500}>
      <Table striped highlightOnHover verticalSpacing="sm" withTableBorder>
        <Table.Thead bg="gray.1">
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th visibleFrom="md">Frente(s)</Table.Th>
            <Table.Th visibleFrom="md" style={{ textAlign: 'center' }}>Bolsa</Table.Th>

            {type === 'registration' && (
              <>
                <Table.Th style={{ textAlign: 'center' }}>HO</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>HP</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Ações</Table.Th>
              </>
            )}

            {type === 'schedule' && (
              <>
                <Table.Th style={{ textAlign: 'center' }}>Horário</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Ação</Table.Th>
              </>
            )}

            {type === 'access' && (
              <>
                <Table.Th style={{ textAlign: 'center' }}>Status</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Ação</Table.Th>
              </>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Center p="md">
                  <Text c="dimmed" fs="italic">Nenhum item encontrado.</Text>
                </Center>
              </Table.Td>
            </Table.Tr>
          ) : (
            data.map((member) => {
              const hasMissingHours = member.ho === 0 && member.hp === 0;
              
              // Usa dados pendentes se existirem, senão usa os dados do membro
              const pendingData = pendingEdits[member.email];
              const currentFrentes = pendingData?.frentes ?? member.frentes;
              const currentBolsa = pendingData?.bolsa ?? member.bolsa;
              
              const frentesList = currentFrentes ? currentFrentes.split(',').map(s => s.trim()).filter(Boolean) : [];
              const maxVisibleFrentes = 1; 
              const visibleFrentes = frentesList.slice(0, maxVisibleFrentes);
              const hiddenCount = frentesList.length - maxVisibleFrentes;
              const hiddenFrentesList = frentesList.slice(maxVisibleFrentes).join(', ');

              return (
                <Table.Tr key={member.email}>
                  <Table.Td>
                    <Group gap="sm">
                      <Stack gap={0}>
                        <Text size="sm" fw={500} style={{ maxWidth: isMobile ? 'auto' : 'auto' }} truncate>
                          {member.name}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ maxWidth: isMobile ? '0' : 'auto' }} truncate>
                          {member.email}
                        </Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  
                 {/* frentes */}
                  <Table.Td visibleFrom="md">
                    {frentesList.length === 0 ? (
                      <Text size="sm" c="dimmed">-</Text>
                    ) : (
                      <Group gap={6} wrap="nowrap" style={{ maxWidth: '180px' }}>
                        <Text size="sm" truncate>
                          {visibleFrentes.join(', ')}
                        </Text>
                        {hiddenCount > 0 && (
                          <Tooltip label={hiddenFrentesList} withArrow multiline w={200}>
                            <Badge size="sm" variant="light" color="gray" circle style={{ cursor: 'help', minWidth: '24px', height: '24px' }}>
                              +{hiddenCount}
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                    )}
                  </Table.Td>

                  {/* bolsa */}
                  <Table.Td visibleFrom="md" style={{ textAlign: 'center' }}>
                    {(() => {
                      const bolsasList = currentBolsa && currentBolsa !== 'nan' && currentBolsa.trim() !== '' 
                        ? currentBolsa.split(',').map(s => s.trim()).filter(Boolean) 
                        : [];
                      
                      if (bolsasList.length === 0) {
                        return <Text size="sm" c="dimmed">-</Text>;
                      }
                      
                      const getBolsaColor = (bolsaName: string) => {
                        const bolsaOption = bolsasOptions.find(b => b.value === bolsaName);
                        return bolsaOption?.color || '#888888';
                      };
                      
                      if (bolsasList.length === 1) {
                        const color = getBolsaColor(bolsasList[0]);
                        return (
                          <Group gap={6} justify="center" wrap="nowrap">
                            <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: color }} />
                            <Text size="sm" fw={500}>
                              {bolsasList[0]}
                            </Text>
                          </Group>
                        );
                      }
                      
                      const visibleBolsas = bolsasList.slice(0, 1);
                      const hiddenCount = bolsasList.length - 1;
                      const hiddenBolsasList = bolsasList.slice(1).join(', ');
                      const color = getBolsaColor(visibleBolsas[0]);
                      
                      return (
                        <Group gap={6} justify="center" wrap="nowrap">
                          <Group gap={4} wrap="nowrap">
                            <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: color }} />
                            <Text size="sm" fw={500}>
                              {visibleBolsas[0]}
                            </Text>
                          </Group>
                          <Tooltip label={hiddenBolsasList} withArrow multiline w={200}>
                            <Badge size="sm" variant="light" color="gray" circle style={{ cursor: 'help', minWidth: '24px', height: '24px' }}>
                              +{hiddenCount}
                            </Badge>
                          </Tooltip>
                        </Group>
                      );
                    })()}
                  </Table.Td>

                  {/* cadastro pendente*/}
                  {type === 'registration' && (
                    <>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text fw={600} c={((pendingEdits[member.email]?.ho ?? member.ho) === 0 && (pendingEdits[member.email]?.hp ?? member.hp) === 0) ? "red" : "green"}>
                          {(pendingEdits[member.email]?.ho ?? member.ho) || 0}h
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Text fw={600} c={((pendingEdits[member.email]?.ho ?? member.ho) === 0 && (pendingEdits[member.email]?.hp ?? member.hp) === 0) ? "red" : "green"}>
                          {(pendingEdits[member.email]?.hp ?? member.hp) || 0}h
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={8} justify="center" wrap="nowrap">
                          <EditMemberPopover member={member} />
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="lg"
                            onClick={() => handleConfirmRegistration(member)}
                          >
                            <IconCheck size={20} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </>
                  )}

                  {/* horario pendente */}
                  {type === 'schedule' && (
                    <>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={6} justify="center" wrap="nowrap">
                          <ActionIcon 
                            variant="outline" 
                            color="blue" 
                            size="lg" 
                            onClick={() => window.open(`/horaise-viewer?personid=${encodeURIComponent(member.email)}`, '_blank')}
                          >
                            <IconEye size={20} />
                          </ActionIcon>
                          {/* Indicador de exceção solicitada - só aparece quando pendingTimeTable === 2 */}
                          {member.pendingTimeTable === 2 && (
                            <Tooltip label="Este horário foi solicitado com exceção às regras" withArrow>
                              <ThemeIcon color="orange" variant="light" size="lg" radius="xl">
                                <IconAlertTriangle size={18} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={8} justify="center" wrap="nowrap">
                          <ActionIcon 
                            color="green" 
                            variant="filled"
                            size="lg" 
                            onClick={() => handleSimpleAction(member.email, 'approve-schedule-remove-editor')}
                          >
                            <IconCheck size={20} />
                          </ActionIcon>
                          <ActionIcon
                            color="blue"
                            variant="light"
                            size="lg"
                            onClick={() => handleOpenDefineSchedule(member.email)}
                          >
                            <IconPencil size={20} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </>
                  )}

                  {/* acesso de edicao */}
                  {type === 'access' && (
                    <>
                      <Table.Td style={{ textAlign: 'center' }}>
                        {member.editor === 1 ? (
                          <Group gap={6} justify="center">
                            <ThemeIcon color="green" variant="light" radius="xl"><IconLockOpen size={16} /></ThemeIcon>
                            {!isMobile && <Text size="sm" c="green" fw={500}>Liberado</Text>}
                          </Group>
                        ) : (
                          <Group gap={6} justify="center">
                            <ThemeIcon color="orange" variant="light" radius="xl"><IconAlertCircle size={16} /></ThemeIcon>
                            {!isMobile && <Text size="sm" c="orange" fw={500}>Pendente</Text>}
                          </Group>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        {member.editor === 1 ? (
                          <ActionIcon 
                            color="red" 
                            variant="subtle"
                            size="lg"
                            onClick={() => setConfirmationModal({ type: 'revoke', email: member.email, name: member.name })}
                          >
                            <IconLock size={20} />
                          </ActionIcon>
                        ) : (
                          <Group gap={8} justify="center" wrap="nowrap">
                             <ActionIcon 
                              color={hasMissingHours ? "gray" : "green"} 
                              variant={hasMissingHours ? "light" : "filled"}
                              size="lg" 
                              disabled={hasMissingHours}
                              onClick={() => !hasMissingHours && setConfirmationModal({ type: 'approve', email: member.email, name: member.name })}
                            >
                              <IconCheck size={20} />
                            </ActionIcon>

                            <ActionIcon 
                              color="red" 
                              variant="light" 
                              size="lg" 
                              onClick={() => setConfirmationModal({ type: 'revoke', email: member.email, name: member.name })}
                            >
                              <IconX size={20} />
                            </ActionIcon>
                          </Group>
                        )}
                      </Table.Td>
                    </>
                  )}
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );

  if (loading) {
    return (
      <Box h="100vh" bg="#F8F9FF">
        <Center h="100%"><Loader size="xl" color="blue" /></Center>
      </Box>
    );
  }

  return (
    <>
      <TopNavBar />
      
      <Box
        style={{
          minHeight: "100vh",
          background: "#F8F9FF",
          paddingTop: isMobile ? "100px": "140px",
          paddingBottom: "40px",
        }}
      >
        <Container size="xl" px={isMobile ? "xs" : "md"}>
          <Group justify="space-between" mb="xl">
            <Box>
              <Title order={2} style={{ color: "#0E1862", fontSize: isMobile ? '1.5rem' : '2rem', paddingTop: isMobile ? "16px" : "0px" }}>
                Gestão Administrativa
              </Title>
              <Text c="dimmed" size="sm">Visão geral das pendências e acessos</Text>
            </Box>
            <Group gap="xs">
              <Button 
                variant="subtle" 
                onClick={fetchMembers}
                loading={refreshing}
                px={isMobile ? "xs" : "md"}
              >
                {isMobile ? <IconRefresh size={20} /> : "Atualizar"}
              </Button>
              <Button 
                variant="light" 
                color="red" 
                onClick={handleLogout}
                px={isMobile ? "xs" : "md"}
              >
                {isMobile ? <IconLogout size={20} /> : "Sair"}
              </Button>
            </Group>
          </Group>

          <Paper shadow="sm" radius="md" p={isMobile ? "xs" : "md"} withBorder>
            <Tabs value={activeTab} onChange={(value) => setActiveTab(value || "cadastros")} color="var(--primary)">
              <Tabs.List mb="md" grow={isMobile}>
                <Tabs.Tab value="cadastros" leftSection={!isMobile && <IconUser size={16} />} rightSection={pendingRegistrations.length > 0 && <Badge size="xs" circle color="red">{pendingRegistrations.length}</Badge>}>
                  {isMobile ? "Cadastros" : "Cadastros Pendentes"}
                </Tabs.Tab>
                <Tabs.Tab value="horarios" leftSection={!isMobile && <IconClock size={16} />} rightSection={pendingSchedules.length > 0 && <Badge size="xs" circle color="orange">{pendingSchedules.length}</Badge>}>
                  {isMobile ? "Horários" : "Horários Pendentes"}
                </Tabs.Tab>
                <Tabs.Tab value="acessos" leftSection={!isMobile && <IconLockOpen size={16} />} rightSection={activeEditors.length > 0 && <Badge size="xs" circle color="blue">{activeEditors.length}</Badge>}>
                  {isMobile ? "Acessos" : "Acessos de Edição"}
                </Tabs.Tab>
                <Tabs.Tab value="sugerir" leftSection={!isMobile && <IconPencil size={16} />}>
                  {isMobile ? "Horário" : "Definir Horário"}
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="cadastros">
                <Stack gap="xs"><MemberTable data={pendingRegistrations} type="registration" /></Stack>
              </Tabs.Panel>
              <Tabs.Panel value="horarios">
                <Stack gap="xs"><MemberTable data={pendingSchedules} type="schedule" /></Stack>
              </Tabs.Panel>
              <Tabs.Panel value="acessos">
                <Stack gap="xs"><MemberTable data={activeEditors} type="access" /></Stack>
              </Tabs.Panel>
              <Tabs.Panel value="sugerir">
                <AdminSuggestionPanel 
                  frentesOptions={frentesOptions}
                  bolsasOptions={bolsasOptions}
                  initialTargetEmail={searchParams.get("personid") || undefined}
                  onSavedSchedule={fetchMembers}
                />
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Container>
      </Box>

      {/* pop up confirmacao */}
      <Modal 
        opened={confirmationModal.type !== null} 
        onClose={() => setConfirmationModal({ type: null, email: '', name: '' })}
        centered
        withCloseButton
        radius="md"
        padding="xl"
      >
        <Stack align="center" gap="md">
          {confirmationModal.type === 'approve' ? (
            <>
              <ThemeIcon radius="xl" size={60} color="green.6" variant="filled">
                <IconCheck size={32} />
              </ThemeIcon>
              
              <Title order={3} ta="center" style={{ color: "#0E1862" }}>
                Conceder acesso de edição?
              </Title>
              
              <Text c="dimmed" size="sm" ta="center">
                <strong>{confirmationModal.name}</strong> terá permissão para editar o conteúdo. 
                Você pode revogar o acesso a qualquer momento.
              </Text>

              <Group w="100%" grow mt="md">
                <Button variant="default" onClick={() => setConfirmationModal({ type: null, email: '', name: '' })}>
                  Cancelar
                </Button>
                <Button color="green" onClick={handleConfirmModal}>
                  Conceder acesso
                </Button>
              </Group>
            </>
          ) : (
            <>
              <ThemeIcon radius="xl" size={60} color="red.6" variant="filled">
                <IconX size={32} />
              </ThemeIcon>
              
              <Title order={3} ta="center" style={{ color: "#0E1862" }}>
                Remover acesso de edição?
              </Title>
              
              <Text c="dimmed" size="sm" ta="center">
                <strong>{confirmationModal.name}</strong> perderá imediatamente a permissão de edição.
              </Text>

              <Group w="100%" grow mt="md">
                <Button variant="default" onClick={() => setConfirmationModal({ type: null, email: '', name: '' })}>
                  Cancelar
                </Button>
                <Button color="red" onClick={handleConfirmModal}>
                  Remover acesso
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}