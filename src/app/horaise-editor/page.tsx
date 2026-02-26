"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  TextInput,
  Button,
  Title,
  Text,
  Stack,
  Anchor,
  Select,
  Group,
  Divider,
} from "@mantine/core";
import { IconEdit, IconMail, IconUsers } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import { notifications } from "@mantine/notifications";
import {
  getMemberByEmail,
  validateEmail,
  getAllMembers,
} from "../../services/googleSheets";
export default function EditorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState<"not-found" | "no-access" | "">("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [allMembers, setAllMembers] = useState<Array<{name: string, email: string}>>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    document.title = "HORAISE | Editor";
    
    // Verifica se é admin e carrega lista de membros
    const checkAdmin = async () => {
      const savedEmail = sessionStorage.getItem("adminEmail");
      if (savedEmail) {
        try {
          const response = await fetch("/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "admin-precheck", email: savedEmail }),
          });
          const result = await response.json();
          if (result.isAdmin) {
            setIsAdmin(true);
            setEmail(savedEmail);
            // Carrega todos os membros
            const members = await getAllMembers();
            const memberList = members
              .filter(m => m.email && m.name)
              .map(m => ({ name: m.name, email: m.email }));
            setAllMembers(memberList);
          }
        } catch (error) {
          console.error("Erro ao verificar admin:", error);
        }
      }
    };
    checkAdmin();
  }, []);

  const handleLogin = async () => {
    setErrorMessage("");
    setErrorType("");

    if (!email.trim()) {
      setErrorMessage("Por favor, insira seu email");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage("Por favor, insira um email válido");
      return;
    }

    setLoading(true);

    try {
      const member = await getMemberByEmail(email);

      if (!member) {
        setErrorType("not-found");
        setErrorMessage("Cadastro não encontrado");
        setLoading(false);
        return;
      }

      // Verifica permissão de edição
      if ((member as any).editor !== 1) {
        setErrorType("no-access");
        setErrorMessage("Sem autorização de edição");
        setLoading(false);
        return;
      }

      // Salva email no sessionStorage para detectar modo admin
      sessionStorage.setItem("adminEmail", email);

      // Verifica se é admin
      const adminCheckResponse = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin-precheck", email }),
      });
      const adminResult = await adminCheckResponse.json();

      if (adminResult.isAdmin) {
        // Se for admin, carrega membros e mostra seletor
        notifications.show({
          title: "Bem-vindo, Admin!",
          message: "Você pode editar seu horário ou de outros membros",
          color: "blue",
          autoClose: 3000,
        });

        setIsAdmin(true);
        setEmail(email);
        
        const members = await getAllMembers();
        const memberList = members
          .filter(m => m.email && m.name)
          .map(m => ({ name: m.name, email: m.email }));
        setAllMembers(memberList);
        setLoading(false);
      } else {
        // Se não for admin, redireciona direto para seu horário
        notifications.show({
          title: "Sucesso!",
          message: "Acesso autorizado",
          color: "green",
          autoClose: 2000,
        });

        const encodedEmail = encodeURIComponent(email);
        router.push(`/edit-content/${encodedEmail}`);
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setErrorMessage("Erro ao conectar com o servidor");
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!email.trim()) {
      notifications.show({
        title: "Erro",
        message: "Por favor, insira seu email primeiro",
        color: "red",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const member = await getMemberByEmail(email);

      if (!member) {
        notifications.show({
          title: "Erro",
          message: "Email não encontrado no sistema",
          color: "red",
          autoClose: 3000,
        });
        setLoading(false);
        return;
      }

      // Enviar solicitação de acesso via API
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "request-editor-access",
          email: email.trim().toLowerCase(),
        }),
      });

      if (response.ok) {
        notifications.show({
          title: "Solicitação enviada",
          message: "Sua solicitação de acesso foi enviada ao administrador",
          color: "blue",
          autoClose: 5000,
        });
        setErrorMessage("");
        setErrorType("");
      } else {
        const data = await response.json();
        notifications.show({
          title: "Erro",
          message: data.error || "Erro ao enviar solicitação",
          color: "red",
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error("Erro ao solicitar acesso:", err);
      notifications.show({
        title: "Erro",
        message: "Erro ao enviar solicitação",
        color: "red",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditMemberSchedule = () => {
    if (!selectedMember) {
      notifications.show({
        title: "Erro",
        message: "Selecione um membro para editar",
        color: "red",
        autoClose: 3000,
      });
      return;
    }
    
    const encodedEmail = encodeURIComponent(selectedMember);
    router.push(`/edit-content/${encodedEmail}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <>
      <TopNavBar />

      <Box
        style={{
          minHeight: "100vh",
          background: "#F8F9FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          paddingTop: "100px",
        }}
      >
        <Paper
          shadow="xl"
          p="xl"
          radius="lg"
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            maxWidth: "450px",
            width: "100%",
            border: "2px solid rgba(142, 201, 252, 0.3)",
          }}
        >
          <Stack gap="md" align="center">
            <Box
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "16px",
                backgroundColor: "rgba(142, 201, 252, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEdit size={40} color="#0E1862" />
            </Box>

            <Stack gap="xs" align="center">
              <Title
                order={1}
                size="h2"
                style={{
                  color: "#0E1862",
                  textAlign: "center",
                }}
              >
                Editor
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Digite seu email para editar seus horários no AISE.
              </Text>
            </Stack>

            <Stack gap="md" style={{ width: "100%" }}>
              <TextInput
                placeholder="Digite seu email..."
                size="md"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                rightSection={<IconMail size={20} color="#ADB5BD" />}
                styles={{
                  input: {
                    border: "2px solid #E9ECEF",
                    "&:focus": {
                      borderColor: "var(--primary)",
                    },
                  },
                }}
              />

              <Box style={{ minHeight: "20px" }}>
                {errorType === "not-found" && (
                  <Text size="sm" c="red" ta="center">
                    {errorMessage}.{" "}
                  </Text>
                )}

                {errorType === "no-access" && (
                  <Text size="sm" c="orange" ta="center">
                    {errorMessage}.{" "}
                    <Anchor
                      onClick={handleRequestAccess}
                      style={{
                        color: "#0E1862",
                        fontWeight: 600,
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      Solicitar acesso
                    </Anchor>
                  </Text>
                )}

                {errorMessage && !errorType && (
                  <Text size="sm" c="red" ta="center">
                    {errorMessage}
                  </Text>
                )}
              </Box>
            </Stack>

            <Button
              fullWidth
              size="md"
              onClick={handleLogin}
              loading={loading}
              disabled={isAdmin}
              style={{
                backgroundColor: "#0E1862",
                "&:hover": {
                  backgroundColor: "#0A1145",
                },
              }}
            >
              Login
            </Button>

            {isAdmin && (
              <>
                <Divider label="Você está logado como admin" labelPosition="center" w="100%" />
                
                <Group grow>
                  <Button
                    size="md"
                    onClick={() => router.push(`/edit-content/${encodeURIComponent(email)}`)}
                    style={{
                      backgroundColor: "#0E1862",
                      "&:hover": {
                        backgroundColor: "#0A1145",
                      },
                    }}
                  >
                    Meu Horário
                  </Button>
                </Group>
              </>
            )}

            {isAdmin && allMembers.length > 0 && (
              <>
                <Divider label="ou edite como administrador" labelPosition="center" w="100%" />
                
                <Select
                  label="Selecionar membro para editar"
                  placeholder="Escolha um membro da equipe"
                  data={allMembers.map(m => ({ 
                    value: m.email, 
                    label: `${m.name} (${m.email})` 
                  }))}
                  value={selectedMember}
                  onChange={setSelectedMember}
                  searchable
                  leftSection={<IconUsers size={16} />}
                  w="100%"
                  styles={{
                    label: { color: "#0E1862", fontWeight: 500 },
                  }}
                />
                
                <Button
                  fullWidth
                  size="md"
                  onClick={handleEditMemberSchedule}
                  disabled={!selectedMember}
                  style={{
                    backgroundColor: "#FF8C00",
                    "&:hover": {
                      backgroundColor: "#FF7700",
                    },
                  }}
                >
                  Editar como Admin
                </Button>
              </>
            )}

            <Text size="xs" c="dimmed" ta="center">
              Não possui cadastro?{" "}
              <Anchor
                href="/horaise-register"
                style={{
                  color: "#0E1862",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Cadastre-se aqui
              </Anchor>
            </Text>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
