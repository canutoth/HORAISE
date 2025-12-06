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
} from "@mantine/core";
import { IconEdit, IconMail } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import { notifications } from "@mantine/notifications";
import {
  getMemberByEmail,
  validateEmail,
} from "../../services/googleSheets";
export default function EditorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState<"not-found" | "no-access" | "">("");

  useEffect(() => {
    document.title = "HORAISE | Editor";
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

      // Membro encontrado e autorizado
      notifications.show({
        title: "Sucesso!",
        message: "Acesso autorizado",
        color: "green",
        autoClose: 2000,
      });

      const encodedEmail = encodeURIComponent(email);
      router.push(`/edit-content/${encodedEmail}`);
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
              style={{
                backgroundColor: "#0E1862",
                "&:hover": {
                  backgroundColor: "#0A1145",
                },
              }}
            >
              Login
            </Button>

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
