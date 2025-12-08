"use client";

import React, { useEffect, useState } from "react";
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
import { useRouter } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import { notifications } from "@mantine/notifications";

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

const FRENTES_OPTIONS = Object.keys(FRENTES_EMOJIS).map((key) => ({
  value: key,
  label: `${FRENTES_EMOJIS[key]} ${key}`,
}));

const BOLSA_OPTIONS = ["PIBIC", "STONE", "Voluntário"];

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

const EditMemberPopover = ({ 
  member, 
  onSave 
}: { 
  member: AdminMember; 
  onSave: (data: any) => void 
}) => {
  const [opened, setOpened] = useState(false);
  const [frentesSelecionadas, setFrentesSelecionadas] = useState<string[]>(
    member.frentes ? member.frentes.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  
  const [bolsaSelecionada, setBolsaSelecionada] = useState<string | null>(
    member.bolsa === "nan" || !member.bolsa ? "Voluntário" : member.bolsa
  );

  const [hours, setHours] = useState({
    hp: member.hp,
    ho: member.ho,
  });

  const handleSave = () => {
    setOpened(false);
    onSave({
      email: member.email,
      frentes: frentesSelecionadas.join(", "),
      bolsa: bolsaSelecionada === "Voluntário" ? "" : bolsaSelecionada,
      hp: hours.hp,
      ho: hours.ho,
      pending: member.pendingAccess,
      editor: member.editor
    });
  };

  return (
    <Popover 
      opened={opened} 
      onChange={setOpened} 
      width={320} 
      position="left" 
      withArrow 
      shadow="md"
      trapFocus
    >
      <Popover.Target>
        <Tooltip label="Editar Informações">
          <ActionIcon 
            variant="light" 
            color="blue" 
            size="lg"
            onClick={() => setOpened((o) => !o)}
          >
            <IconPencil size={20} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm" fw={700} c="dimmed">Editar Dados do Membro</Text>
          
          <MultiSelect
            label="Frente(s)"
            size="xs"
            placeholder="Selecione as frentes"
            data={FRENTES_OPTIONS}
            value={frentesSelecionadas}
            onChange={setFrentesSelecionadas}
            searchable
            clearable
            hidePickedOptions
          />
          
          <Select
            label="Bolsa"
            size="xs"
            placeholder="Selecione o tipo"
            data={BOLSA_OPTIONS}
            value={bolsaSelecionada}
            onChange={setBolsaSelecionada}
            allowDeselect={false}
          />

          <Group grow>
            <NumberInput
              label="Horas Online"
              size="xs"
              value={hours.ho}
              onChange={(val) => setHours({ ...hours, ho: Number(val) || 0 })}
              min={0}
            />
            <NumberInput
              label="Horas Pres."
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
            Salvar Alterações
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [confirmationModal, setConfirmationModal] = useState<{
    type: 'approve' | 'revoke' | null;
    email: string;
    name: string;
  }>({ type: null, email: '', name: '' });

  const fetchMembers = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all-members" }),
      });
      const data = await response.json();
      
      if (response.ok && data.members) {
        const mappedMembers = data.members.slice(1).map((row: any, index: number) => ({
          name: row[0],
          email: row[1],
          frentes: row[2],
          bolsa: row[3],
          editor: Number(row[4] || 0),
          pendingAccess: Number(row[5] || 0),
          pendingTimeTable: Number(row[6] || 0),
          hp: Number(row[7] || 0),
          ho: Number(row[8] || 0),
          rowNumber: index + 2,
        }));
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
    fetchMembers();
  }, []);

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

  // confirmar acao
  const handleConfirmModal = async () => {
    if (!confirmationModal.type || !confirmationModal.email) return;

    // para rejeitar ou bloquear
    const action = confirmationModal.type === 'approve' 
      ? 'approve-registration' 
      : 'revoke-editor';

    await handleSimpleAction(confirmationModal.email, action);
    setConfirmationModal({ type: null, email: '', name: '' });
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
          hp: String(data.hp),
          ho: String(data.ho),
          pending: data.pending,
          editor: data.editor
        }),
      });

      if (!response.ok && response.status === 400) {
        console.warn("Backend não suporta update-member-data.");
      }

      const resJson = await response.json();
      
      if (response.ok) {
        notifications.show({ title: "Salvo", message: "Dados atualizados!", color: "blue" });
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

  const pendingRegistrations = members.filter(m => m.ho === 0 || m.hp === 0);
  const pendingSchedules = members.filter(m => m.pendingTimeTable === 1);
  const activeEditors = members.filter(m => m.pendingAccess === 1 || m.editor === 1);

  const MemberTable = ({ data, type }: { data: AdminMember[], type: 'registration' | 'schedule' | 'access' }) => (
    <Table striped highlightOnHover verticalSpacing="sm" withTableBorder>
      <Table.Thead bg="gray.1">
        <Table.Tr>
          <Table.Th>Nome</Table.Th>
          <Table.Th>Frente(s)</Table.Th>
          <Table.Th>Bolsa</Table.Th>

          {type === 'registration' && (
            <>
              <Table.Th style={{ textAlign: 'center' }}>HO</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>HP</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Ações</Table.Th>
            </>
          )}

          {type === 'schedule' && (
            <>
              <Table.Th style={{ textAlign: 'center' }}>Horário</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Aceitar</Table.Th>
            </>
          )}

          {type === 'access' && (
            <>
              <Table.Th style={{ textAlign: 'center' }}>Status</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Ação</Table.Th>
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
            const hasMissingHours = member.ho === 0 || member.hp === 0;
            const frentesList = member.frentes ? member.frentes.split(',').map(s => s.trim()).filter(Boolean) : [];
            const maxVisibleFrentes = 1; 
            const visibleFrentes = frentesList.slice(0, maxVisibleFrentes);
            const hiddenCount = frentesList.length - maxVisibleFrentes;
            const hiddenFrentesList = frentesList.slice(maxVisibleFrentes).join(', ');

            return (
              <Table.Tr key={member.email}>
                <Table.Td>
                  <Group gap="sm">
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>{member.name}</Text>
                      <Text size="xs" c="dimmed">{member.email}</Text>
                    </Stack>
                  </Group>
                </Table.Td>
                
                <Table.Td>
                  {frentesList.length === 0 ? (
                    <Text size="sm" c="dimmed">-</Text>
                  ) : (
                    <Group gap={6} wrap="nowrap" style={{ maxWidth: '180px' }}>
                      <Text size="sm" truncate>{visibleFrentes.join(', ')}</Text>
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

                <Table.Td>
                  <Badge variant="dot" color={member.bolsa && member.bolsa !== 'nan' ? "blue" : "gray"}>
                    {member.bolsa && member.bolsa !== 'nan' ? member.bolsa : "Voluntário"}
                  </Badge>
                </Table.Td>

                {/* CADASTRO PENDENTE */}
                {type === 'registration' && (
                  <>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Text fw={600} c="red">{member.ho || 0}h</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Text fw={600} c="red">{member.hp || 0}h</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={8} justify="flex-end">
                        <EditMemberPopover member={member} onSave={handleUpdateData} />
                        <Tooltip label="Rejeitar Cadastro">
                          <ActionIcon 
                            color="red" 
                            variant="light" 
                            size="lg" 
                            onClick={() => handleSimpleAction(member.email, 'revoke-editor')}
                          >
                            <IconX size={20} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </>
                )}

                {/* HORÁRIO PENDENTE */}
                {type === 'schedule' && (
                  <>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Button size="xs" variant="outline" color="blue" leftSection={<IconEye size={14} />} onClick={() => window.open(`/horaise-viewer?personid=${encodeURIComponent(member.email)}`, '_blank')}>
                        Visualizar
                      </Button>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Tooltip label="Aprovar Horário">
                        <Button size="xs" color="green" leftSection={<IconCheck size={14} />} onClick={() => handleSimpleAction(member.email, 'approve-schedule-remove-editor')}>
                          Aceitar
                        </Button>
                      </Tooltip>
                    </Table.Td>
                  </>
                )}

                {/* ACESSO DE EDIÇÃO */}
                {type === 'access' && (
                  <>
                    <Table.Td style={{ textAlign: 'center' }}>
                      {member.editor === 1 ? (
                        <Badge color="green" variant="light" leftSection={<IconLockOpen size={12} />}>Liberado</Badge>
                      ) : (
                        <Group gap="xs" justify="center">
                           <Badge color="orange" variant="light" leftSection={<IconAlertCircle size={12} />}>Solicitado</Badge>
                          {hasMissingHours && (
                            <Tooltip label="Horas não configuradas! Corrija na aba Cadastros."><IconAlertTriangle size={16} color="orange" /></Tooltip>
                          )}
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {member.editor === 1 ? (
                        // bloquear -> pop up vermelho
                        <Tooltip label="Revogar Acesso (Bloquear)">
                          <Button 
                            size="xs" 
                            color="red" 
                            variant="subtle"
                            leftSection={<IconLock size={14} />}
                            onClick={() => setConfirmationModal({ type: 'revoke', email: member.email, name: member.name })}
                          >
                            Bloquear
                          </Button>
                        </Tooltip>
                      ) : (
                        <Group gap={8} justify="flex-end">
                          {/* bloquear -> pop up verde */}
                          <Tooltip label={hasMissingHours ? "Configure as horas na aba 'Cadastros' antes de liberar" : "Aprovar Solicitação"}>
                             <ActionIcon 
                              color={hasMissingHours ? "gray" : "green"} 
                              variant={hasMissingHours ? "light" : "filled"}
                              size="lg" 
                              disabled={hasMissingHours}
                              onClick={() => !hasMissingHours && setConfirmationModal({ type: 'approve', email: member.email, name: member.name })}
                            >
                              <IconCheck size={20} />
                            </ActionIcon>
                          </Tooltip>

                          {/* rejeitar -> pop up vermelho */}
                          <Tooltip label="Rejeitar Solicitação">
                            <ActionIcon 
                              color="red" 
                              variant="light" 
                              size="lg" 
                              onClick={() => setConfirmationModal({ type: 'revoke', email: member.email, name: member.name })}
                            >
                              <IconX size={20} />
                            </ActionIcon>
                          </Tooltip>
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
          paddingTop: "140px",
          paddingBottom: "40px",
        }}
      >
        <Container size="xl">
          <Group justify="space-between" mb="xl">
            <Box>
              <Title order={2} style={{ color: "#0E1862" }}>
                Gestão Administrativa
              </Title>
              <Text c="dimmed" size="sm">Visão geral das pendências e acessos</Text>
            </Box>
            <Group>
              <Button variant="subtle" leftSection={<IconRefresh size={18} />} loading={refreshing} onClick={fetchMembers}>
                Atualizar
              </Button>
              <Button variant="light" color="red" leftSection={<IconLogout size={18} />} onClick={handleLogout}>
                Sair
              </Button>
            </Group>
          </Group>

          <Paper shadow="sm" radius="md" p="md" withBorder>
            <Tabs defaultValue="cadastros" color="var(--primary)">
              <Tabs.List mb="md">
                <Tabs.Tab value="cadastros" leftSection={<IconUser size={16} />} rightSection={pendingRegistrations.length > 0 && <Badge size="xs" circle color="red">{pendingRegistrations.length}</Badge>}>
                  Cadastros Pendentes
                </Tabs.Tab>
                <Tabs.Tab value="horarios" leftSection={<IconClock size={16} />} rightSection={pendingSchedules.length > 0 && <Badge size="xs" circle color="orange">{pendingSchedules.length}</Badge>}>
                  Horários Pendentes
                </Tabs.Tab>
                <Tabs.Tab value="acessos" leftSection={<IconLockOpen size={16} />} rightSection={activeEditors.length > 0 && <Badge size="xs" circle color="blue">{activeEditors.length}</Badge>}>
                  Acessos de Edição
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