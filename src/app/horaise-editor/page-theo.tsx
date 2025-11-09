"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  TextInput,
  Button,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  Loader,
  Center,
  ThemeIcon,
} from "@mantine/core";
import { IconMail, IconAlertCircle, IconLogin, IconArrowLeft, IconLock, IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  getMemberByEmail,
  validateEmail,
} from "../../services/googleSheets";
import Link from "next/link";
import { PasswordInput, Modal, Group } from "@mantine/core";

// Detecta modo offline (apenas via flag pública)
const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === "true";

export default function EditorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Define o título da página
  useEffect(() => {
    document.title = "HORAISE | Editor";
  }, []);

  // Emails de exemplo disponíveis no modo offline
  const offlineEmails = ["exemplo@example.com", "test@test.com"];

  const handleLogin = async () => {
    setError("");

    // Validação básica
    if (!email.trim()) {
      setError("Por favor, insira seu email");
      return;
    }

    if (!validateEmail(email)) {
      setError("Por favor, insira um email válido");
      return;
    }

    setLoading(true);

    try {
      // Pre-check: se for email de admin, abre modal de senha
      try {
        const res = await fetch("/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "admin-precheck", email }),
        });
        if (res.ok) {
          const j = await res.json();
          if (j.isAdmin) {
            setLoading(false);
            setAdminOpen(true);
            return;
          }
        }
      } catch (_) {}

      // Busca o membro pelo email
      const member = await getMemberByEmail(email);

      if (member) {
        // Verifica permissão de edição
        if ((member as any).editor !== 1) {
          setError("Você não possui acesso de edição. Solicite permissão ao administrador.");
          setLoading(false);
          return;
        }
        // Membro encontrado - redireciona para página de edição
        console.log("Membro existente encontrado:", member.name);
        const encodedEmail = encodeURIComponent(email);
        router.push(`/edit-content/${encodedEmail}`);
      } else {
        // Membro não encontrado - redireciona para cadastro
        console.log("Membro não encontrado - redirecionando para cadastro");
        setError("Email não encontrado. Por favor, cadastre-se primeiro.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setError(
        "Erro ao conectar com o servidor. Verifique sua conexão e tente novamente."
      );
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setAdminError("");
    if (!adminPassword.trim()) {
      setAdminError("Digite sua senha");
      return;
    }
    setAdminSubmitting(true);
    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin-login", email, password: adminPassword }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setAdminError(j.message || "Senha incorreta");
        return;
      }
      // sucesso
      setAdminOpen(false);
      router.push("/horaise-admin");
    } catch (e) {
      setAdminError("Erro ao validar acesso");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

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
      <Container size="xs">
        {/* Modal de Acesso de Administrador */}
        <Modal
          opened={adminOpen}
          onClose={() => setAdminOpen(false)}
          title={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, whiteSpace: "nowrap", width: "100%" }}>
              <IconAlertTriangle size={18} />
              <span style={{ fontWeight: 600 }}>Acesso de administrador</span>
            </div>
          }
          centered
        >
          <Text size="sm" c="dimmed" mb="md">
            Este e-mail pertence a um administrador.<br />Insira sua senha para continuar.
          </Text>
          {/* <Group gap="xs" mb="md">
              <ThemeIcon size="lg" variant="light" color="var(--primary)">
                <IconAlertCircle size={18} />
              </ThemeIcon>
              <Title order={3} size="h4" style={{ color: "var(--primary)" }}>
                Como funciona
              </Title>
            </Group> */}

          <PasswordInput
            label="Senha"
            placeholder="Digite sua senha"
            leftSection={<IconLock size={16} />}
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.currentTarget.value)}
            error={adminError || undefined}
            disabled={adminSubmitting}
          />
          <Group justify="flex-end" mt="md">
            <Button onClick={handleAdminLogin} loading={adminSubmitting} style={{ background: "var(--primary)" }}>
              Login
            </Button>
          </Group>
          
        </Modal>
        <Paper
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
                HORAISE Editor
              </Title>
              <Text size="sm" c="dimmed">
                Edite seus horários no Lab
              </Text>
            </Box>

            {/* Modo Offline - Aviso */}
            {OFFLINE_MODE && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="🔌 Modo Offline/Desenvolvimento"
                color="orange"
                variant="light"
              >
                <Text size="sm" fw={500}>
                  Você está em modo offline. As alterações não serão salvas no
                  Google Sheets.
                </Text>
                <Text size="sm" mt="xs">
                  Emails de teste disponíveis:
                </Text>
                <Stack gap={4} mt={4}>
                  {offlineEmails.map((testEmail) => (
                    <Text
                      key={testEmail}
                      size="sm"
                      c="orange.7"
                      style={{
                        fontFamily: "monospace",
                        cursor: "pointer",
                      }}
                      onClick={() => setEmail(testEmail)}
                    >
                      • {testEmail}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}

            {/* Instruções */}
            {!OFFLINE_MODE && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="Como funciona"
                color="var(--primary)"
                variant="light"
              >
                <Text size="sm">
                  Digite seu email para editar seus horários no AISE.
                </Text>
                <Text size="sm" mt="sm">
                  Não possui cadastro?{" "}
                  <Link
                    href="/cadastro"
                    style={{
                      color: "var(--primary)",
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    Cadastre-se aqui
                  </Link>
                </Text>
              </Alert>
            )}

            {/* Campo de Email */}
            <TextInput
              size="md"
              label="Email"
              placeholder="seu.email@exemplo.com"
              leftSection={<IconMail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              error={error}
              styles={{
                label: {
                  color: "#000000",
                },
                input: {
                  color: "#000000",
                  "::placeholder": {
                    color: "#000000",
                    opacity: 0.7,
                  },
                },
              }}
            />

            {/* Botão de Login */}
            <Button
              size="md"
              fullWidth
              onClick={handleLogin}
              disabled={loading}
              rightSection={
                loading ? (
                  <Loader size="xs" color="white" />
                ) : (
                  <IconLogin size={18} />
                )
              }
              styles={{
                root: {
                  background: "var(--primary)",
                  border: "none",
                  "&:hover": {
                    background: "var(--primary)",
                    opacity: 0.9,
                  },
                  "&[dataDisabled]": {
                    background: "var(--primary)",
                    opacity: 0.6,
                  },
                },
              }}
            >
              {loading ? "Verificando..." : "Acessar Editor"}
            </Button>
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
