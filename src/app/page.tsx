"use client";

import React, { useEffect } from "react";
import {
  Box,
  Paper,
  Title,
  Text,
  Container,
  Stack,
  SimpleGrid,
  Group,
  ThemeIcon,
} from "@mantine/core";
import {
  IconEdit,
  IconCalendarEvent,
  IconEye,
  IconArrowRight,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";

export default function HomePage() {
  useEffect(() => {
    document.title = "HORAISE";
  }, []);

  const router = useRouter();

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
        }}
      >
        <Container size="md">
          <Stack gap="xl">
            <Stack gap={4} ta="center" mb="lg">
              <Title order={2} style={{ color: "#000000" }}>
                O que você pode fazer com o HorAISE?
              </Title>

              <Text size="md" c="#2D2D2D">
                O HORAISE oferece 3 ferramentas integradas para gerenciar seus horários no Lab.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">

              <Paper
                shadow="lg"
                p="xl"
                radius="lg"
                style={{
                  background: "rgba(255, 255, 255, 0.98)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: "2px solid transparent",
                  display: "flex",
                  flexDirection: "column",
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
                <Stack gap="md" align="center" ta="center" style={{ height: "100%" }}>
                  <ThemeIcon
                    size={80}
                    radius="lg"
                    style={{
                      backgroundColor: "rgba(142, 201, 252, 0.2)",
                      color: "#0E1862",
                    }}
                  >
                    <IconCalendarEvent size={40} />
                  </ThemeIcon>

                  <Box>
                    <Title order={2} size="h3" style={{ color: "#000000" }}>
                      Scheduler
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Encontre os melhores horários para agendar reuniões com a equipe
                    </Text>
                  </Box>

                  <Group gap="xs" mt="auto">
                    <Text size="sm" fw={600} c="#0E1862">
                      Acessar
                    </Text>
                    <IconArrowRight size={18} color="#0E1862" />
                  </Group>
                </Stack>
              </Paper>

              <Paper
                shadow="lg"
                p="xl"
                radius="lg"
                style={{
                  background: "rgba(255, 255, 255, 0.98)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: "2px solid transparent",
                  display: "flex",
                  flexDirection: "column",
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
                <Stack gap="md" align="center" ta="center" style={{ height: "100%" }}>
                  <ThemeIcon
                    size={80}
                    radius="lg"
                    style={{
                      backgroundColor: "rgba(142, 201, 252, 0.2)",
                      color: "#0E1862",
                    }}
                  >
                    <IconEdit size={40} />
                  </ThemeIcon>

                  <Box>
                    <Title order={2} size="h3" style={{ color: "#000000" }}>
                      Editor
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Aloque e edite sua disponibilidade semanal e as frentes que você atua
                    </Text>
                  </Box>

                  <Group gap="xs" mt="auto">
                    <Text size="sm" fw={600} c="#0E1862">
                      Acessar
                    </Text>
                    <IconArrowRight size={18} color="#0E1862" />
                  </Group>
                </Stack>
              </Paper>

              <Paper
                shadow="lg"
                p="xl"
                radius="lg"
                style={{
                  background: "rgba(255, 255, 255, 0.98)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: "2px solid transparent",
                  display: "flex",
                  flexDirection: "column",
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
                <Stack gap="md" align="center" ta="center" style={{ height: "100%" }}>
                  <ThemeIcon
                    size={80}
                    radius="lg"
                    style={{
                      backgroundColor: "rgba(142, 201, 252, 0.2)",
                      color: "#0E1862",
                    }}
                  >
                    <IconEye size={40} />
                  </ThemeIcon>

                  <Box>
                    <Title order={2} size="h3" style={{ color: "#000000" }}>
                      Viewer
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Visualize os horários de todos os membros
                    </Text>
                  </Box>

                  <Group gap="xs" mt="auto">
                    <Text size="sm" fw={600} c="#0E1862">
                      Acessar
                    </Text>
                    <IconArrowRight size={18} color="#0E1862" />
                  </Group>
                </Stack>
              </Paper>

            </SimpleGrid>

            <Box ta="center" mt="lg">
              <Text size="xs" c="rgba(0, 0, 0, 0.5)">
                © 2025 AISE Lab - PUC-Rio
              </Text>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}