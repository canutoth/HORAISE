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
  MultiSelect,
} from "@mantine/core";
import { IconUser, IconMail, IconAlertCircle, IconDeviceFloppy, IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import {
  saveMember,
  validateEmail,
  getMemberByEmail,
  type TeamMemberData,
} from "../../services/googleSheets";
// Detecta modo offline
const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === "true";
// Lista de frentes disponíveis
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
export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [frentes, setFrente] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorNome, setErrorNome] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [errorFrente, setErrorFrente] = useState("");
  // Define o título da página
  useEffect(() => {
    document.title = "HORAISE | Cadastro";
  }, []);
  const handleCadastro = async () => {
    // Limpa erros anteriores
    setErrorNome("");
    setErrorEmail("");
    setErrorFrente("");
    // Validações
    let hasError = false;
    if (!nome.trim()) {
      setErrorNome("Por favor, insira nome + sobrenome");
      hasError = true;
    }
    if (!email.trim() || !validateEmail(email)) {
      setErrorEmail("Por favor, insira um email válido");
      hasError = true;
    }
    if (!frentes || frentes.length === 0) {
      setErrorFrente("Por favor, selecione pelo menos uma frente");
      hasError = true;
    }
    if (hasError) return;
    setLoading(true);
    try {
      // Verifica se o email já está cadastrado
      const emailLower = email.trim().toLowerCase();
      const existingMember = await getMemberByEmail(emailLower);
      if (existingMember) {
        setErrorEmail("Este email já está cadastrado. Use a página de login para acessar.");
        setLoading(false);
        return;
      }
      // Cria o novo membro
      const newMember: TeamMemberData = {
        name: nome.trim(),
        email: emailLower,
        frentes: frentes.join(", "), // Junta as frentes com vírgula
        schedule: {}, // Schedule vazio
      };
      // Salva no Google Sheets
      const result = await saveMember(newMember, true);
      if (result.success) {
        // Sucesso - mostra mensagem de pendente SEM redirecionar
        console.log("Cadastro realizado com sucesso:", newMember.name);
        notifications.show({
          title: "Cadastro Pendente",
          message: "Seu cadastro está pendente de aprovação. Aguarde o administrador configurar suas horas e liberar o acesso.",
          color: "yellow",
          autoClose: false, // Não fecha automaticamente
        });
        // Limpa o formulário
        setNome("");
        setEmail("");
        setFrente([]);
      } else {
        setErrorEmail(result.message || "Erro ao realizar cadastro");
      }
    } catch (err) {
      console.error("Erro ao cadastrar:", err);
      setErrorEmail(
        "Erro ao conectar com o servidor. Verifique sua conexão e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCadastro();
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
            {}
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
                Cadastro HORAISE
              </Title>
            </Box>
            {}
            {OFFLINE_MODE && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="🔌 Modo Offline/Desenvolvimento"
                color="orange"
                variant="light"
              >
                <Text size="sm">
                  Você está em modo offline. O cadastro não será salvo no Google Sheets.
                </Text>
              </Alert>
            )}
            {}
            <Alert
              icon={<IconAlertCircle size={18} />}
              title="Como funciona"
              color="var(--primary)"
              variant="light"
            >
              <Text size="sm">
                Preencha os campos abaixo para criar seu perfil e começar a editar seus horários no Lab.
              </Text>
            </Alert>
            {}
            <TextInput
              size="md"
              label="Nome"
              placeholder="Seu nome e sobrenome"
              leftSection={<IconUser size={18} />}
              value={nome}
              onChange={(e) => setNome(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              required
              error={errorNome}
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
            {}
            <TextInput
              size="md"
              label="Email"
              placeholder="seu.email@exemplo.com"
              leftSection={<IconMail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              required
              error={errorEmail}
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
            {}
            <MultiSelect
              size="md"
              label="Frente(s)"
              placeholder={frentes.length === 0 ? "Selecione uma ou mais frentes" : ""}
              data={FRENTES_OPTIONS}
              value={frentes}
              onChange={setFrente}
              disabled={loading}
              required
              searchable
              clearable
              error={errorFrente}
              styles={{
                label: {
                  color: "#000000",
                },
                input: {
                  color: "#000000",
                },
              }}
            />
            {}
            {}
            <Stack gap="xs">
              <Button
                size="md"
                fullWidth
                onClick={handleCadastro}
                disabled={loading}
                leftSection={
                  loading ? (
                    <Loader size="xs" color="white" />
                  ) : (
                    <IconDeviceFloppy size={18} />
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
                {loading ? "Cadastrando..." : "Criar Cadastro"}
              </Button>
              <Button
                size="md"
                fullWidth
                variant="light"
                color="gray"
                onClick={() => router.push("/horaise-editor")}
                disabled={loading}
                leftSection={<IconArrowLeft size={18} />}
              >
                Voltar para Login
              </Button>
            </Stack>
            {}
            <Box ta="center">
              <Text size="xs" c="dimmed">
                {OFFLINE_MODE
                  ? "Modo offline: cadastro não será salvo permanentemente"
                  : "Seu cadastro será sincronizado com o Google Sheets"}
              </Text>
            </Box>
          </Stack>
        </Paper>
        {}
        <Center mt="xl">
          <Text size="xs" c="white" ta="center">
            © 2025 AISE Lab
          </Text>
        </Center>
      </Container>
    </Box>
  );
}
