"use client";

import React, { useState } from "react";
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
} from "@mantine/core";
import { IconMail, IconAlertCircle, IconLogin } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  getMemberByEmail,
  getExampleData,
  validateEmail,
  type TeamMemberData,
} from "../services/googleSheets";
import Link from "next/link";

// Detecta modo offline (apenas via flag pública)
// Use apenas variável pública para evitar hydration mismatch.
const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      // Busca o membro pelo email
      const member = await getMemberByEmail(email);

      if (member) {
        // Membro encontrado - redireciona para página de edição
        console.log("Membro existente encontrado:", member.name);
        const encodedEmail = encodeURIComponent(email);
        router.push(`/edit-content/${encodedEmail}`);
      } else {
        // Membro não encontrado - cria novo com dados de exemplo
        console.log("Novo membro - criando perfil com dados de exemplo");
        const exampleData = await getExampleData();
        const newMember: TeamMemberData = {
          ...exampleData,
          email: email, // Mantém o email fornecido
        };

        // Salva o novo membro em sessionStorage para uso na página de edição
        if (typeof window !== "undefined") {
          sessionStorage.setItem("newMember", JSON.stringify(newMember));
          sessionStorage.setItem("isNewMember", "true");
        }

        // Redireciona para página de edição
        const encodedEmail = encodeURIComponent(email);
        router.push(`/edit-content/${encodedEmail}`);
      }
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setError(
        "Erro ao conectar com o servidor. Verifique sua conexão e tente novamente."
      );
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
                Edite seus horários no Lab (=
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
                <Text size="xs" mt="sm" c="dimmed">
                  Para ativar o modo online, configure as variáveis de ambiente
                  no arquivo .env.local
                </Text>
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
                  Digite seu email para acessar ou editar seus horários no AISELab.
                </Text>
                <Text size="sm" mt="sm">
                  Não possui cadastro? {" "}
                  <Link
                    href=""
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--primary)",
                      fontWeight: 600,
                      textDecoration: "underline",
                      textDecorationThickness: "1px",
                    }}
                  >
                    Cadastre-se
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
              color="black"
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
                  borderColor: error ? "#fa5252" : undefined,
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
                  "&[dataDisabled]": {
                    background: "var(--primary)",
                    opacity: 1,
                    cursor: "not-allowed",
                  },
                },
                label: {
                  color: "white",
                },
              }}
            >
              {loading ? "Verificando..." : "Acessar Editor"}
            </Button>

            {/* Informações adicionais */}
            <Box ta="center">
              <Text size="xs" c="dimmed">
                {OFFLINE_MODE
                  ? "Modo offline: alterações não serão salvas permanentemente"
                  : "Suas alterações serão sincronizadas com o Google Sheets"}
              </Text>
            </Box>
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
