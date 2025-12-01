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
  Textarea,
  Alert,
  Loader,
  Center,
  Grid,
  Divider,
  Badge,
  MultiSelect,
  ActionIcon,
  Modal,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconPencil,
  IconLock,
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
import ProfileInstructions from "../../../components/Rules";
import Schedule from "../../../components/Schedule";

// Mapeamento de frentes para emojis
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

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const personId = decodeURIComponent(params?.personid as string);

  const [memberData, setMemberData] = useState<TeamMemberData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleData>({});
  const [savedSchedule, setSavedSchedule] = useState<ScheduleData>({}); // Schedule salvo (para comparação)
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewMember, setIsNewMember] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEditingFrentes, setIsEditingFrentes] = useState(false);
  const [editedFrentes, setEditedFrentes] = useState<string[]>([]);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesViolations, setRulesViolations] = useState<RuleViolation[]>([]);

  // Lista de frentes disponíveis (mesma do cadastro)
  const FRENTES_OPTIONS = [
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

  // Define o título da página
  useEffect(() => {
    document.title = `HORAISE | Editor`;
  }, []);

  // Detecta mobile apenas para layout; não altera desktop
  useEffect(() => {
    const handleResize = () =>
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sem reserva extra: sticky ocupa o próprio espaço no fluxo

  // Util: deep clone simples (suficiente para nosso shape { [day]: { [hour]: status|null } })
  const cloneSchedule = (s: ScheduleData): ScheduleData => JSON.parse(JSON.stringify(s || {}));

  // Util: codifica o schedule num formato canônico ordenado (sem depender da ordem de inserção)
  // Dias: 0..6 (Dom..Sáb), Horas: 7..19
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

  // Carrega os dados do membro
  useEffect(() => {
    const notifiedRef = { current: false } as { current: boolean };
    const loadMemberData = async () => {
      setIsLoading(true);
      try {
        // Verifica se há dados de novo membro no sessionStorage
        if (typeof window !== "undefined") {
          const newMemberData = sessionStorage.getItem("newMember");
          const isNew = sessionStorage.getItem("isNewMember") === "true";

          if (isNew && newMemberData) {
            const member = JSON.parse(newMemberData) as TeamMemberData;
            setMemberData(member);
            const memberSchedule = member.schedule || {};
            setSchedule(memberSchedule);
            setSavedSchedule(cloneSchedule(memberSchedule)); // Salva o schedule inicial (deep clone)
            setIsNewMember(true);
            // Limpa o sessionStorage
            sessionStorage.removeItem("newMember");
            sessionStorage.removeItem("isNewMember");
            setIsLoading(false);

            // notificação removida conforme solicitado
            return;
          }
        }

        // Busca membro existente
        const member = await getMemberByEmail(personId);
        if (member) {
          // Verificar se tem permissão de edição
          if (member.editor !== 1) {
            const isPending = member.pending === 1;
            const errorMsg = isPending
              ? "Seu cadastro está pendente de aprovação. Aguarde o administrador liberar o acesso."
              : "Você não tem permissão para editar. Solicite liberação ao administrador.";
            
            notifications.show({
              title: "Acesso Negado",
              message: errorMsg,
              color: "red",
              icon: <IconLock />,
              autoClose: 5000,
            });
            
            setTimeout(() => router.push("/horaise-editor"), 2000);
            return;
          }
          
          setMemberData(member);
          const memberSchedule = member.schedule || {};
          setSchedule(memberSchedule);
          setSavedSchedule(cloneSchedule(memberSchedule)); // Salva o schedule inicial (deep clone)
          setIsNewMember(false);
        } else {
          // Se não encontrar e não há dados no sessionStorage,
          // cria um novo perfil com dados de exemplo
          const exampleData = await getExampleData();
          const newMember: TeamMemberData = {
            ...exampleData,
            email: personId, // Usa o email fornecido
          };
          setMemberData(newMember);
          const exampleSchedule = newMember.schedule || {};
          setSchedule(exampleSchedule);
          setSavedSchedule(cloneSchedule(exampleSchedule)); // Salva o schedule inicial (deep clone)
          setIsNewMember(true);

        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        notifications.show({
          title: "Erro",
          message: "Erro ao carregar dados. Tente novamente.",
          color: "red",
        });
        // Em caso de erro, redireciona para a página inicial
        setTimeout(() => router.push("/"), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    if (personId) {
      loadMemberData();
    }
  }, [personId, router]);

  // Cria dados atualizados combinando memberData com schedule
  const currentData = useMemo<TeamMemberData | null>(() => {
    if (!memberData) return null;
    return {
      ...memberData,
      schedule,
    };
  }, [memberData, schedule]);

  // Verifica se há alterações não salvas no schedule (ordem-insensível)
  const hasUnsavedChanges = useMemo(() => {
    return toCanonicalString(schedule) !== toCanonicalString(savedSchedule);
  }, [schedule, savedSchedule]);

  // Validação dos dados
  const validation = useMemo(() => {
    if (!currentData) return { valid: false, errors: ["Dados inválidos"] };
    return validateMemberData(currentData);
  }, [currentData]);

  // Função para iniciar edição de frentes
  const handleStartEditFrentes = () => {
    if (memberData?.frentes) {
      const currentFrentes = memberData.frentes
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      setEditedFrentes(currentFrentes);
      setIsEditingFrentes(true);
    }
  };

  // Função para salvar frentes editadas
  const handleSaveFrentes = async () => {
    if (editedFrentes.length === 0) {
      notifications.show({
        title: "Erro",
        message: "Você deve ter pelo menos uma frente selecionada",
        color: "red",
        icon: <IconX />,
      });
      return;
    }

    if (!memberData) return;

    try {
      const updatedMember: TeamMemberData = {
        ...memberData,
        frentes: editedFrentes.join(", "),
        schedule,
      };

      const result = await saveMember(updatedMember, false);

      if (result.success) {
        setMemberData(updatedMember);
        setIsEditingFrentes(false);
        notifications.show({
          title: "Sucesso!",
          message: "Frentes atualizadas com sucesso",
          color: "green",
          icon: <IconCheck />,
        });
      } else {
        notifications.show({
          title: "Erro",
          message: result.message || "Erro ao atualizar frentes",
          color: "red",
          icon: <IconX />,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar frentes:", error);
      notifications.show({
        title: "Erro",
        message: "Erro ao atualizar frentes",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  // Função para cancelar edição de frentes
  const handleCancelEditFrentes = () => {
    setIsEditingFrentes(false);
    setEditedFrentes([]);
  };

  // Salvar alterações
  const handleSave = async () => {
    if (!currentData) {
      notifications.show({
        title: "Erro",
        message: "Dados inválidos. Corrija os erros antes de salvar.",
        color: "red",
        icon: <IconX />,
      });
      return false;
    }

    if (!validation.valid) {
      notifications.show({
        title: "Erro de Validação",
        message: validation.errors.join(", "),
        color: "red",
        icon: <IconX />,
      });
      return false;
    }

    // Acumula TODAS as violações antes de mostrar o modal
    const allViolations: RuleViolation[] = [];
    
    // Validação de HP/HO (horas presenciais + online)
    const hp = memberData?.hp ? parseFloat(memberData.hp) : 0;
    const ho = memberData?.ho ? parseFloat(memberData.ho) : 0;
    
    if (hp > 0 && ho > 0) {
      // Converte schedule para array de códigos (mesmo formato que vai para planilha)
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
      
      // Valida horas usando a mesma lógica do backend
      const hoursValidation = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate-hours",
          scheduleRow: scheduleArray,
          hp,
          ho
        })
      }).then(res => res.json());
      
      if (!hoursValidation.isValid) {
        allViolations.push(
          {
            code: "weekday-lunch-11-14" as any, // Usa qualquer code pois é genérico
            day: -1,
            message: `❌ ${hoursValidation.message}`
          },
          ...(hoursValidation.details ? [
            {
              code: "weekday-lunch-11-14" as any,
              day: -1,
              message: `📊 Seu horário: ${hoursValidation.details.totalPresencial}h presenciais + ${hoursValidation.details.totalOnline}h online + ${hoursValidation.details.totalReuniao}h reuniões = ${hoursValidation.details.totalGeral}h total`
            }
          ] : [])
        );
      }
    }
    
    // Validação de regras do schedule (ex.: almoço nos dias úteis)
    const scheduleResult = validateSchedule(schedule);
    if (!scheduleResult.ok) {
      allViolations.push(...scheduleResult.violations);
    }
    
    // Se houver qualquer violação, mostra TODAS no modal
    if (allViolations.length > 0) {
      setRulesViolations(allViolations);
      setRulesModalOpen(true);
      return false; // bloqueia o save
    }

    // Verifica se o email é o exemplo (não pode ser salvo)
    if (currentData.email === "exemplo@example.com") {
      notifications.show({
        title: "Erro",
        message: "Não é possível salvar dados de exemplo. Altere o email.",
        color: "red",
        icon: <IconX />,
      });
      return false;
    }

    setIsSaving(true);

    try {
      const result = await saveMember(currentData, isNewMember);

      if (result.success) {
        notifications.show({
          title: "Sucesso!",
          message: "Dados salvos com sucesso no Google Sheets",
          color: "green",
          icon: <IconCheck />,
        });
        
        // IMPORTANTE: Recarregar dados da planilha para pegar editor=0 após salvar
        try {
          const updatedMember = await getMemberByEmail(personId);
          if (updatedMember) {
            setMemberData(updatedMember);
            setSavedSchedule(cloneSchedule(updatedMember.schedule || {}));
            
            // Se editor foi bloqueado (=0), mostrar aviso e redirecionar
            if (updatedMember.editor === 0) {
              notifications.show({
                title: "Acesso Bloqueado",
                message: "Seus dados foram salvos e seu acesso foi bloqueado. Solicite liberação ao administrador para editar novamente.",
                color: "yellow",
                autoClose: 5000,
              });
              setTimeout(() => router.push("/horaise-editor"), 3000);
            }
          } else {
            // Fallback: apenas atualiza estado local
            setMemberData(currentData);
            setSavedSchedule(cloneSchedule(schedule));
          }
        } catch (reloadError) {
          console.warn("Não foi possível recarregar dados:", reloadError);
          setMemberData(currentData);
          setSavedSchedule(cloneSchedule(schedule));
        }
        
        setIsNewMember(false);
        return true;
      } else {
        // Tratar erros específicos (isPending, isBlocked)
        const errorMsg = (result as any).isPending 
          ? "Seu cadastro está pendente de aprovação. Aguarde o administrador liberar o acesso."
          : (result as any).isBlocked
          ? "Você não tem permissão para editar. Solicite liberação ao administrador."
          : result.message;
        
        notifications.show({
          title: "Erro ao Salvar",
          message: errorMsg,
          color: "red",
          icon: <IconX />,
          autoClose: 8000,
        });
        
        // Se está bloqueado ou pendente, redirecionar
        if ((result as any).isPending || (result as any).isBlocked) {
          setTimeout(() => router.push("/horaise-editor"), 3000);
        }
        
        return false;
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      notifications.show({
        title: "Erro",
        message: "Erro ao salvar dados. Tente novamente.",
        color: "red",
        icon: <IconX />,
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Aviso ao usuário caso tente fechar/atualizar a aba com alterações não salvas
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
    if (hasUnsavedChanges) {
      setConfirmExitOpen(true);
    } else {
      router.push("/horaise-editor");
    }
  };

  // Resetar para dados de exemplo
  const handleReset = async () => {
    try {
      const exampleData = await getExampleData();
      const resetData: TeamMemberData = {
        ...exampleData,
        email: memberData?.email || personId, // Mantém o email atual
      };
      setMemberData(resetData);
      setSchedule(resetData.schedule || {});
      notifications.show({
        title: "Resetado",
        message: "Dados resetados para exemplo (email mantido)",
        color: "blue",
        icon: <IconRefresh />,
      });
    } catch (error) {
      console.error("Erro ao resetar:", error);
      notifications.show({
        title: "Erro",
        message: "Erro ao carregar dados de exemplo",
        color: "red",
      });
    }
  };

  if (isLoading) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Center>
          <Stack align="center" gap="sm">
            <Loader size="xl" color="white" />
            <Text c="white" fw={600}>
              {memberData?.name ? `Carregando dados de ${memberData.name}…` : "Carregando seu perfil…"}
            </Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "var(--primary)",
        padding: "20px",
        paddingTop: "40px",
        paddingBottom: "40px",
        overflowX: "hidden",
      }}
    >
      <Container size="100%" style={{ overflowX: "visible" }}>
        {/* Header */}
        <Paper
          shadow="md"
          p="md"
          radius="lg"
          mb="md"
          style={{
            background: "rgba(255, 255, 255, 0.98)",
          }}
        >
          {/* Desktop: Layout original */}
          <Box visibleFrom="sm">
            <Group justify="space-between" wrap="nowrap">
              <Group>
                <Button
                  leftSection={<IconArrowLeft size={18} />}
                  variant="light"
                  color="var(--primary)"
                  onClick={handleBackClick}
                >
                  Voltar
                </Button>
                <Box>
                  <Title order={2} size="h3" style={{ color: "var(--primary)" }}>
                    Olá, {memberData?.name || personId}
                  </Title>
                  <Text size="sm" c="dimmed">
                    Editando perfil de:{" "}
                    {personId}
                  </Text>
                </Box>
              </Group>
              <Badge
                size="lg"
                variant="light"
                color={hasUnsavedChanges ? "orange" : "green"}
                leftSection={
                  hasUnsavedChanges ? <IconAlertCircle size={16} /> : <IconCheck size={16} />
                }
              >
                {hasUnsavedChanges ? "Desincronizado" : "Sincronizado"}
              </Badge>
            </Group>
          </Box>

          {/* Mobile: Badge na mesma linha do Voltar */}
          <Box hiddenFrom="sm">
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap" align="center">
                <Button
                  leftSection={<IconArrowLeft size={18} />}
                  variant="light"
                  color="var(--primary)"
                  onClick={handleBackClick}
                  size="sm"
                >
                  Voltar
                </Button>
                <Badge
                  size="md"
                  variant="light"
                  color={hasUnsavedChanges ? "orange" : "green"}
                  leftSection={
                    hasUnsavedChanges ? <IconAlertCircle size={14} /> : <IconCheck size={14} />
                  }
                  style={{ flexShrink: 0 }}
                >
                  {hasUnsavedChanges ? "Desincronizado" : "Sincronizado"}
                </Badge>
              </Group>
              <Box>
                <Title order={2} size="h4" style={{ color: "var(--primary)" }}>
                  Olá, {memberData?.name || personId}
                </Title>
                <Text size="sm" c="dimmed">
                  Editando perfil de:{" "}
                  {personId}
                </Text>
              </Box>
            </Stack>
          </Box>
        </Paper>

        {/* Modal de confirmação ao sair com alterações não salvas */}
        <Modal opened={confirmExitOpen} onClose={() => setConfirmExitOpen(false)} title="Atenção! Você tem alterações não salvas." centered>
          {/* <Text>Você tem alterações não salvas.</Text> */}
          <Group justify="flex-end" mt="md">
            <Button color="green" loading={isSaving} onClick={async () => { setConfirmExitOpen(false); const ok = await handleSave(); if (ok) router.push("/horaise-editor"); }}>Salvar e sair</Button>
            <Button variant="light" color="red" onClick={() => { setConfirmExitOpen(false); router.push("/horaise-editor"); }}>Sair sem salvar</Button>
            <Button variant="default" onClick={() => setConfirmExitOpen(false)}>Cancelar</Button>
          </Group>
        </Modal>

        {/* Modal de Regras do Schedule */}
        <Modal
          opened={rulesModalOpen}
          onClose={() => setRulesModalOpen(false)}
          title="Ajustes necessários no seu horário"
          centered
          size="lg"
        >
          <Alert icon={<IconAlertCircle />} color="orange" variant="light" mb="sm">
            <Text size="sm">
              Para salvar seus horários, corrija os itens abaixo:
            </Text>
          </Alert>
          <Stack gap="xs">
            {rulesViolations.map((v, idx) => (
              <Box key={idx}>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {v.message}
                </Text>
              </Box>
            ))}
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setRulesModalOpen(false)} leftSection={<IconCheck size={16} />}>Ok, vou ajustar</Button>
          </Group>
        </Modal>

        {/* Frentes do Membro */}
        {memberData?.frentes && (
          <Paper
            shadow="md"
            p="md"
            radius="lg"
            mb="md"
            style={{
              background: "rgba(255, 255, 255, 0.98)",
            }}
          >
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <Title order={3} size="h4" style={{ color: "var(--primary)" }}>
                  Minhas Frentes
                </Title>
                {!isEditingFrentes && (
                  <ActionIcon
                    variant="subtle"
                    color="var(--primary)"
                    onClick={handleStartEditFrentes}
                    size="sm"
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
            {isEditingFrentes ? (
              <Stack gap="md">
                <MultiSelect
                  data={FRENTES_OPTIONS}
                  value={editedFrentes}
                  onChange={setEditedFrentes}
                  placeholder={editedFrentes.length === 0 ? "Selecione suas frentes" : ""}
                  searchable
                  clearable={false}
                  error={editedFrentes.length === 0 ? "Selecione pelo menos uma frente" : undefined}
                />
                <Group gap="xs">
                  <Button
                    leftSection={<IconCheck size={16} />}
                    color="green"
                    onClick={handleSaveFrentes}
                    disabled={editedFrentes.length === 0}
                  >
                    Salvar
                  </Button>
                  <Button
                    leftSection={<IconX size={16} />}
                    variant="light"
                    color="gray"
                    onClick={handleCancelEditFrentes}
                  >
                    Cancelar
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Group gap="xs">
                {memberData.frentes
                  .split(",")
                  .map((f) => f.trim())
                  .filter(Boolean)
                  .sort((a, b) => a.localeCompare(b))
                  .map((frente, idx) => {
                    const emoji = FRENTE_EMOJIS[frente] || "📌";
                    return (
                      <Badge
                        key={idx}
                        size="lg"
                        variant="light"
                        color="indigo"
                        style={{ cursor: "default" }}
                      >
                        {emoji} {frente}
                      </Badge>
                    );
                  })}
              </Group>
            )}
          </Paper>
        )}

        {/* Instruções de Preenchimento */}
        <ProfileInstructions />

        {/* Alert de novo membro */}
        {isNewMember && (
          <Alert
            radius="lg"
            variant="white"
            icon={<IconAlertCircle />}
            title="Novo Perfil"
            color="var(--primary)"
            mb="md"
          >
            Este é um novo perfil. Os dados abaixo são de exemplo. Edite-os e
            clique em "Salvar" para criar seu perfil no Google Sheets.
          </Alert>
        )}

        {/* Erros de validação */}
        {!validation.valid && (
          <Alert
            variant="white"
            radius="lg"
            icon={<IconAlertCircle />}
            title={`Erros de Validação (${validation.errors.length})`}
            color="red"
            mb="md"
          >
            <Text size="sm" mb="xs">
              Corrija os seguintes erros antes de salvar:
            </Text>
            <Stack gap="xs">
              {validation.errors.map((error, idx) => (
                <Text key={idx} size="sm" style={{ fontFamily: "monospace" }}>
                  {error}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        {/* Editor de Horários - Layout Único */}
        <Paper
          // shadow="md"
          p="md"
          radius="lg"
          mb="md"
          style={{
            background: "rgba(255, 255, 255, 0.98)",
          }}
        >
          <Title
            order={3}
            size="h4"
            mb="md"
            style={{ color: "var(--primary)" }}
          >
            Editor de Horários
          </Title>

          <Box style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "center" : "stretch", overflow: isMobile ? "visible" : "hidden", paddingBottom: isMobile ? "calc(8px + env(safe-area-inset-bottom))" : undefined }}>
            <Box style={{ width: "100%", overflowX: "visible" }}>
              <Schedule schedule={schedule} onChange={(newSchedule: ScheduleData) => setSchedule(newSchedule)} />
            </Box>

            {/* Botões de ação - Desktop (inalterado) */}
            {!isMobile && (
              <Box style={{ width: "100%", maxWidth: "1150px", margin: "12px auto 0" }}>
                <Box
                  style={{
                    display: "grid",
                    gridTemplateColumns: "250px 120px 1fr",
                    alignItems: "start",
                  }}
                >
                  <Box />
                  <Box />
                  <Box style={{ display: "flex", justifyContent: "center" }}>
                    <Box style={{ width: "780px", maxWidth: "100%", display: "flex", justifyContent: "center" }}>
                      <Group gap="md">
                        <Button
                          leftSection={<IconX size={18} />}
                          variant="light"
                          color="gray"
                          onClick={() => setSchedule({})}
                        >
                          Limpar Calendário
                        </Button>
                        <Button
                          leftSection={<IconDeviceFloppy size={18} />}
                          color="green"
                          onClick={handleSave}
                          disabled={!validation.valid || isSaving}
                          loading={isSaving}
                        >
                          {isSaving ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                      </Group>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Botões de ação - Mobile (sempre visíveis dentro do editor) */}
            {isMobile && (
              <Box
                style={{
                  position: "sticky",
                  bottom: 0,
                  width: "100%",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.98) 100%)",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  zIndex: 2,
                }}
              >
                <Stack gap="xs">
                  <Button
                    leftSection={<IconX size={18} />}
                    variant="light"
                    color="gray"
                    onClick={() => setSchedule({})}
                    fullWidth
                  >
                    Limpar Calendário
                  </Button>
                  <Button
                    leftSection={<IconDeviceFloppy size={18} />}
                    color="green"
                    onClick={handleSave}
                    disabled={!validation.valid || isSaving}
                    loading={isSaving}
                    fullWidth
                  >
                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>


      </Container>
    </Box>
  );
}
