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
} from "../../../services/googleSheets";
import PersonCard from "../../../components/PersonCard";
import MemberListHorizontal from "../../../components/MemberListHorizontal";
import MemberListVertical from "../../../components/MemberListVertical";
import FullProfile from "../../../components/FullProfile";
import ProfileInstructions from "../../../components/ProfileInstructions";

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const personId = decodeURIComponent(params?.personid as string);

  const [jsonText, setJsonText] = useState("");
  const [memberData, setMemberData] = useState<TeamMemberData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewMember, setIsNewMember] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

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
            setJsonText(JSON.stringify(member, null, 2));
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
          setJsonText(JSON.stringify(member, null, 2));
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
          setJsonText(JSON.stringify(newMember, null, 2));
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

  // Parse do JSON em tempo real
  const parsedData = useMemo<TeamMemberData | null>(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      return parsed as TeamMemberData;
    } catch (error) {
      if (jsonText.trim() !== "") {
        setJsonError("JSON inválido");
      }
      return null;
    }
  }, [jsonText]);

  // Validação dos dados
  const validation = useMemo(() => {
    if (!parsedData) return { valid: false, errors: ["JSON inválido"] };
    return validateMemberData(parsedData);
  }, [parsedData]);

  // Salvar alterações
  const handleSave = async () => {
    if (!parsedData) {
      notifications.show({
        title: "Erro",
        message: "JSON inválido. Corrija os erros antes de salvar.",
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
    if (parsedData.email === "exemplo@example.com") {
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
      const result = await saveMember(parsedData, isNewMember);

      if (result.success) {
        notifications.show({
          title: "Sucesso!",
          message: "Dados salvos com sucesso no Google Sheets",
          color: "green",
          icon: <IconCheck />,
        });
        setMemberData(parsedData);
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
      setJsonText(JSON.stringify(resetData, null, 2));
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
                  Editor de Perfil
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
              color={validation.valid ? "green" : "red"}
              leftSection={
                validation.valid ? <IconCheck size={16} /> : <IconX size={16} />
              }
            >
              {validation.valid ? "Válido" : "Inválido"}
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

        <Grid gutter="md">
          {/* Painel Esquerdo - Editor JSON */}
          <Grid.Col span={{ base: 12, md: 4.5 }}>
            <Paper
              shadow="md"
              p="md"
              radius="lg"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                height: "calc(100vh - 250px)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Title
                order={3}
                size="h4"
                mb="md"
                style={{ color: "var(--primary)" }}
              >
                Editor JSON
              </Title>

              <Box
                style={{ flex: 1, display: "flex", flexDirection: "column" }}
              >
                <Textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.currentTarget.value)}
                  placeholder="Cole ou edite o JSON aqui..."
                  styles={{
                    wrapper: {
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    },
                    root: {
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    },
                    input: {
                      fontFamily: "monospace",
                      fontSize: "12px",
                      resize: "none",
                      flex: 1,
                      minHeight: "100%",
                    },
                  }}
                  error={jsonError}
                />
              </Box>

              <Divider my="md" />

              <Group justify="space-between">
                <Button
                  leftSection={<IconRefresh size={18} />}
                  variant="light"
                  color="var(--primary)"
                  onClick={handleReset}
                >
                  Resetar para Exemplo
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
            </Paper>
          </Grid.Col>

          {/* Painel Direito - Preview */}
          <Grid.Col span={{ base: 12, md: 7.5 }}>
            <Paper
              shadow="md"
              p="md"
              radius="lg"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                height: "calc(100vh - 250px)",
                overflowY: "auto",
              }}
            >
              <Title
                order={3}
                size="h4"
                mb="md"
                style={{ color: "var(--primary)" }}
              >
                Preview em Tempo Real
              </Title>

              {parsedData ? (
                <Stack gap="lg">
                  {/* Preview 1: PersonCard */}
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">
                      PersonCard (carrossel / página de time)
                    </Text>
                    <Center>
                      {" "}
                      <PersonCard
                        name={parsedData.name}
                        position={parsedData.position}
                        imageUrl={parsedData.imageUrl}
                        description={parsedData.description}
                        cardWidth={240}
                      />
                      <PersonCard
                        name={parsedData.name}
                        position={parsedData.position}
                        imageUrl={parsedData.imageUrl}
                        description={parsedData.description}
                        cardWidth={240}
                        roles={parsedData.expertise?.slice(0, 2)}
                      />
                    </Center>
                  </Box>

                  <Divider />

                  {/* Preview 2: Lista de Membros - Vizualização Horizontal (desktop) */}
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">
                      Lista de Membros - Vizualização desktop
                    </Text>{" "}
                    <Center>
                      <Box
                        style={{
                          width: "35%",
                        }}
                      >
                        <MemberListHorizontal member={parsedData} />
                      </Box>
                    </Center>
                  </Box>

                  <Divider />

                  {/* Preview 3: Lista de Membros - Vizualização Vertical (mobile) */}
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">
                      Lista de Membros - Vizualização mobile
                    </Text>
                    <Center>
                      <Box
                        style={{
                          width: "35%",
                        }}
                      >
                        <MemberListVertical
                          member={parsedData}
                          avatarSize={90}
                        />
                      </Box>
                    </Center>
                  </Box>

                  <Divider />

                  {/* Preview 4: Perfil Completo */}
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">
                      Página de Perfil Completo
                    </Text>
                    <FullProfile member={parsedData} />
                  </Box>
                </Stack>
              ) : (
                <Center h={400}>
                  <Text c="dimmed">
                    JSON inválido - corrija os erros para ver o preview
                  </Text>
                </Center>
              )}
            </Paper>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}
