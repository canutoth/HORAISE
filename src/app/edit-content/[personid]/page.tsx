"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconArrowLeft,
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
import ProfileInstructions from "../../../components/Rules";
import Schedule from "../../../components/Schedule";

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
            setSavedSchedule(memberSchedule); // Salva o schedule inicial
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
          setMemberData(member);
          const memberSchedule = member.schedule || {};
          setSchedule(memberSchedule);
          setSavedSchedule(memberSchedule); // Salva o schedule inicial
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
          setSavedSchedule(exampleSchedule); // Salva o schedule inicial
          setIsNewMember(true);

          // notificação removida conforme solicitado
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

  // Verifica se há alterações não salvas no schedule
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(schedule) !== JSON.stringify(savedSchedule);
  }, [schedule, savedSchedule]);

  // Validação dos dados
  const validation = useMemo(() => {
    if (!currentData) return { valid: false, errors: ["Dados inválidos"] };
    return validateMemberData(currentData);
  }, [currentData]);

  // Salvar alterações
  const handleSave = async () => {
    if (!currentData) {
      notifications.show({
        title: "Erro",
        message: "Dados inválidos. Corrija os erros antes de salvar.",
        color: "red",
        icon: <IconX />,
      });
      return;
    }

    if (!validation.valid) {
      notifications.show({
        title: "Erro de Validação",
        message: validation.errors.join(", "),
        color: "red",
        icon: <IconX />,
      });
      return;
    }

    // Verifica se o email é o exemplo (não pode ser salvo)
    if (currentData.email === "exemplo@example.com") {
      notifications.show({
        title: "Erro",
        message: "Não é possível salvar dados de exemplo. Altere o email.",
        color: "red",
        icon: <IconX />,
      });
      return;
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
        setMemberData(currentData);
        setSavedSchedule(schedule); // Atualiza o schedule salvo
        setIsNewMember(false); // Agora não é mais novo
      } else {
        notifications.show({
          title: "Erro ao Salvar",
          message: result.message,
          color: "red",
          icon: <IconX />,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      notifications.show({
        title: "Erro",
        message: "Erro ao salvar dados. Tente novamente.",
        color: "red",
        icon: <IconX />,
      });
    } finally {
      setIsSaving(false);
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
          <Loader size="xl" color="white" />
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
      }}
    >
      <Container size="100%">
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
          <Group justify="space-between" wrap="nowrap">
            <Group>
              <Button
                leftSection={<IconArrowLeft size={18} />}
                variant="light"
                color="var(--primary)"
                onClick={() => router.push("/")}
              >
                Voltar
              </Button>
              <Box>
                <Title order={2} size="h3" style={{ color: "var(--primary)" }}>
                  Editor de Horários
                </Title>
                <Text size="sm" c="dimmed">
                  {isNewMember ? "Novo perfil" : "Editando perfil existente"}:{" "}
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
        </Paper>

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
          shadow="md"
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

          <Box style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Schedule schedule={schedule} onChange={setSchedule} />

            {/* Botões de ação - Centralizados com o calendário */}
            <Box style={{ width: "100%", maxWidth: "870px", display: "flex", justifyContent: "center", paddingLeft: "450px" }}>
              <Group gap="md" mt="md">
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
        </Paper>


      </Container>
    </Box>
  );
}
