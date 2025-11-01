"use client";

import React from "react";
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
  IconArrowRight,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
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
          {/* Header Principal */}
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
              Bem-vindo(a) ao HORAISE!
            </Title>
            <Text size="lg" c="rgba(255, 255, 255, 0.9)">
              Framework do AISE para facilitar agendamento de reuniões
            </Text>
          </Box>

          {/* Como Funciona */}
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
              O HORAISE oferece duas ferramentas integradas para gerenciar seus horários no Lab:
            </Text>
            <Stack gap="xs" mt="md">
              <Text size="sm" c="black">
                <strong style={{ color: "var(--primary)" }}>HORAISE Editor:</strong> Crie e edite sua disponibilidade semanal
              </Text>
              <Text size="sm" c="black">
                <strong style={{ color: "var(--primary)" }}>HORAISE Scheduler:</strong> Encontre horários em comum para agendar reuniões com a equipe
              </Text>
            </Stack>
          </Paper>

          {/* Cards das Ferramentas */}
          <SimpleGrid
            cols={{ base: 1, sm: 2 }}
            spacing="lg"
          >
            {/* Card: HORAISE Editor */}
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
                    HORAISE Editor
                  </Title>
                  <Text size="sm" c="dimmed" mt="xs">
                    Edite seus horários de disponibilidade
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

            {/* Card: HORAISE Scheduler (Placeholder) */}
            <Paper
              shadow="lg"
              p="xl"
              radius="lg"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: "2px solid transparent",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "#868e96";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              {/* Badge "Em Breve" */}
              <Box
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "#ffc107",
                  color: "#000",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                EM BREVE
              </Box>

              <Stack gap="md" align="center" ta="center" style={{ opacity: 0.7 }}>
                <ThemeIcon
                  size={80}
                  radius="xl"
                  variant="light"
                  color="gray"
                >
                  <IconCalendarEvent size={40} />
                </ThemeIcon>
                <Box>
                  <Title order={2} size="h3" c="dimmed">
                    HORAISE Scheduler
                  </Title>
                  <Text size="sm" c="dimmed" mt="xs">
                    Agende reuniões com a equipe
                  </Text>
                </Box>
                <Text size="xs" c="dimmed" mt="sm" style={{ fontStyle: "italic" }}>
                  Funcionalidade em desenvolvimento
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          {/* Footer */}
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
