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
  MultiSelect,
  Tooltip,
  Badge,
  Group,
} from "@mantine/core";
import { IconUserPlus, IconX, IconMail, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import TopNavBar from "@/components/TopNavBar";
import {
  saveMember,
  validateEmail,
  getMemberByEmail,
  getBacklogOptions,
  type TeamMemberData,
} from "../../services/googleSheets";
export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [frentes, setFrente] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorNome, setErrorNome] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [errorFrente, setErrorFrente] = useState("");
  const [frentesOptions, setFrentesOptions] = useState<string[]>([]);
  // Define o título da página
  useEffect(() => {
    document.title = "HORAISE | Cadastro";
  }, []);

  // Carrega opções de frentes
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await getBacklogOptions();
        // Mapeia para formato de string simples
        setFrentesOptions(options.frentes.map(f => f.name));
      } catch (error) {
        console.error("Erro ao carregar opções:", error);
      }
    };
    loadOptions();
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
      const result = await saveMember(newMember, true, false);
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
              <IconUserPlus size={40} color="#0E1862" />
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
                Cadastro
              </Title>
              <Text size="sm" c="dimmed" ta="center">
                Preencha os campos abaixo para criar seu perfil e começar a editar seus horários no Lab.
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
                error={errorEmail}
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

              <TextInput
                placeholder="Seu nome e sobrenome"
                size="md"
                value={nome}
                onChange={(e) => setNome(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                error={errorNome}
                rightSection={<IconUser size={20} color="#ADB5BD" />}
                styles={{
                  input: {
                    border: "2px solid #E9ECEF",
                    "&:focus": {
                      borderColor: "var(--primary)",
                    },
                  },
                }}
              />

              <Box style={{ width: "100%" }}>
                <MultiSelect
                  placeholder="Selecione uma ou mais frentes"
                  size="md"
                  data={frentesOptions}
                  value={frentes}
                  onChange={setFrente}
                  disabled={loading}
                  searchable={false}
                  clearable
                  error={errorFrente}
                  maxDropdownHeight={200}
                  hidePickedOptions={false}
                  styles={{
                    input: {
                      border: "2px solid #E9ECEF",
                      "&:focus": {
                        borderColor: "var(--primary)",
                      },
                      minHeight: "42px",
                      height: "42px",
                      cursor: "pointer",
                    },
                    pill: {
                      display: "none",
                    },
                  }}
                  renderOption={({ option, checked }) => (
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "4px 0",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        style={{ cursor: "pointer" }}
                      />
                      <Text size="sm">{option.label}</Text>
                    </Box>
                  )}
                />
                <Box mt="xs" style={{ minHeight: "32px" }}>
                  {frentes.length > 0 && (
                    <Group gap="xs" wrap="wrap">
                      {frentes.slice(0, 2).map((frente) => (
                        <Badge
                          key={frente}
                          size="lg"
                          radius="md"
                          style={{
                            backgroundColor: "rgba(142, 201, 252, 0.2)",
                            color: "#0E1862",
                            paddingRight: "4px",
                            maxWidth: "140px",
                          }}
                          rightSection={
                            <Box
                              onClick={(e) => {
                                e.stopPropagation();
                                setFrente(frentes.filter((f) => f !== frente));
                              }}
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                marginLeft: "4px",
                              }}
                            >
                              <IconX size={14} />
                            </Box>
                          }
                        >
                          <Text
                            size="xs"
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {frente}
                          </Text>
                        </Badge>
                      ))}
                      {frentes.length > 2 && (
                        <Tooltip
                          label={
                            <Stack gap={4}>
                              {frentes.slice(2).map((frente) => (
                                <Text key={frente} size="xs">
                                  {frente}
                                </Text>
                              ))}
                            </Stack>
                          }
                          position="bottom"
                          withArrow
                        >
                          <Badge
                            size="lg"
                            radius="md"
                            style={{
                              backgroundColor: "rgba(142, 201, 252, 0.3)",
                              color: "#0E1862",
                              cursor: "help",
                            }}
                          >
                            +{frentes.length - 2}
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>
                  )}
                </Box>
              </Box>
            </Stack>

            <Button
              fullWidth
              size="md"
              onClick={handleCadastro}
              loading={loading}
              style={{
                backgroundColor: "#0E1862",
                "&:hover": {
                  backgroundColor: "#0A1145",
                },
              }}
            >
              Criar Cadastro
            </Button>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
