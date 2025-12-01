"use client";
import React, { useEffect } from "react";
import {
  Box,
  Paper,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  SimpleGrid,
  Group,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconEdit,
  IconCalendarEvent,
  IconEye,
  IconArrowRight,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
export default function HomePage() {
  useEffect(() => {
    document.title = "HORAISE";
  }, []);
  const router = useRouter();
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
      <Container size="md">
        <Stack gap="xl">
          {}
          <Box ta="center">
            <Title
              order={1}
              size="h1"
              style={{
                color: "white",
                marginBottom: 16,
                fontSize: "clamp(2rem, 5vw, 3rem)",
              }}
            >
              HORAISE
            </Title>
            <Text size="lg" c="rgba(255, 255, 255, 0.9)">
              Framework do AISE para facilitar agendamento de reuniões
            </Text>
          </Box>
          {}
          <Paper
            shadow="md"
            p="lg"
            radius="lg"
            style={{
              background: "rgba(255, 255, 255, 0.98)",
            }}
          >
            <Group gap="xs" mb="md">
              <ThemeIcon size="lg" variant="light" color="var(--primary)">
                <IconAlertCircle size={18} />
              </ThemeIcon>
              <Title order={3} size="h4" style={{ color: "var(--primary)" }}>
                Como funciona
              </Title>
            </Group>
            <Text size="sm" c="dimmed">
              O HORAISE oferece 3 ferramentas integradas para gerenciar seus horários no Lab:
            </Text>
            <Stack gap="xs" mt="md">
              <Text size="sm" c="black">
                <strong style={{ color: "var(--primary)" }}>HORAISE Scheduler:</strong> Encontre os melhores horários para agendar reuniões com a equipe
              </Text>
              <Text size="sm" c="black">
                <strong style={{ color: "var(--primary)" }}>HORAISE Editor:</strong> Aloque e edite sua disponibilidade semanal e as frentes que você atua
              </Text>
              <Text size="sm" c="black">
                <strong style={{ color: "var(--primary)" }}>HORAISE Viewer:</strong> Visualize os horários de todos os membros
              </Text>
            </Stack>
          </Paper>
          {}
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3 }}
            spacing="lg"
          >
            {}
            <Paper
              shadow="lg"
              p="xl"
              radius="lg"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow = "";
              }}
              onClick={() => router.push("/horaise-scheduler")}
            >
              <Stack gap="md" align="center" ta="center">
                <ThemeIcon
                  size={80}
                  radius="xl"
                  variant="light"
                  color="var(--primary)"
                >
                  <IconCalendarEvent size={40} />
                </ThemeIcon>
                <Box>
                  <Title order={2} size="h3" style={{ color: "var(--primary)" }}>
                    HORAISE {<br />} Scheduler
                  </Title>
                  <Text size="sm" c="dimmed" mt="xs">
                    Encontre horários em comum
                  </Text>
                </Box>
                <Group gap="xs" mt="sm">
                  <Text size="sm" fw={600} c="var(--primary)">
                    Acessar Scheduler
                  </Text>
                  <IconArrowRight size={18} color="var(--primary)" />
                </Group>
              </Stack>
            </Paper>
            {}
            <Paper
              shadow="lg"
              p="xl"
              radius="lg"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow = "";
              }}
              onClick={() => router.push("/horaise-editor")}
            >
              <Stack gap="md" align="center" ta="center">
                <ThemeIcon
                  size={80}
                  radius="xl"
                  variant="light"
                  color="var(--primary)"
                >
                  <IconEdit size={40} />
                </ThemeIcon>
                <Box>
                  <Title order={2} size="h3" style={{ color: "var(--primary)" }}>
                    HORAISE {<br />} Editor
                  </Title>
                  <Text size="sm" c="dimmed" mt="xs">
                    Edite sua agenda
                  </Text>
                </Box>
                <Group gap="xs" mt="sm">
                  <Text size="sm" fw={600} c="var(--primary)">
                    Acessar Editor
                  </Text>
                  <IconArrowRight size={18} color="var(--primary)" />
                </Group>
              </Stack>
            </Paper>
            {}
            <Paper
              shadow="lg"
              p="xl"
              radius="lg"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow = "";
              }}
              onClick={() => router.push("/horaise-viewer")}
            >
              <Stack gap="md" align="center" ta="center">
                <ThemeIcon
                  size={80}
                  radius="xl"
                  variant="light"
                  color="var(--primary)"
                >
                  <IconEye size={40} />
                </ThemeIcon>
                <Box>
                  <Title order={2} size="h3" style={{ color: "var(--primary)" }}>
                    HORAISE {<br />} Viewer
                  </Title>
                  <Text size="sm" c="dimmed" mt="xs">
                    Visualize os horários do time
                  </Text>
                </Box>
                <Group gap="xs" mt="sm">
                  <Text size="sm" fw={600} c="var(--primary)">
                    Acessar Viewer
                  </Text>
                  <IconArrowRight size={18} color="var(--primary)" />
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
          {}
          <Box ta="center">
            <Text size="xs" c="rgba(255, 255, 255, 0.8)">
              © 2025 AISE Lab - PUC-Rio
            </Text>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
