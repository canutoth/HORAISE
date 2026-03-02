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
import { useMediaQuery } from "@mantine/hooks"; // Importante para detectar mobile

export default function HomePage() {
  useEffect(() => {
    document.title = "HORAISE";
  }, []);

  const router = useRouter();
  // Detecta se é mobile (tela menor que 768px)
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <>
      <TopNavBar />

      <Box
        style={{
          minHeight: "100vh",
          background: "#F8F9FF",
          display: "flex",
          // Mobile: alinha no topo (para rolar). Desktop: centraliza verticalmente.
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "center",
          padding: "20px",
          // Mobile: Padding maior no topo para não ficar atrás da Navbar fixa
          paddingTop: isMobile ? "120px" : "20px", 
        }}
      >
        <Container size="md" w="100%">
          <Stack gap="xl">
            <Stack gap={4} ta="center" mb={isMobile ? "md" : "lg"}>
              <Title 
                order={2} 
                style={{ color: "#000000" }}
                // Tamanho da fonte responsivo
                fz={{ base: '1.5rem', md: '1.75rem' }} 
              >
                O que você pode fazer com o HorAISE?
              </Title>

              <Text size={isMobile ? "sm" : "md"} c="#2D2D2D">
                O HORAISE oferece 3 ferramentas integradas para gerenciar seus horários no Lab.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">

              {/* CARD 1: SCHEDULER */}
              <Paper
                shadow="lg"
                p={{ base: "lg", md: "xl" }} // Padding menor no mobile
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
                  if (!isMobile) { // Efeito hover apenas no desktop
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.boxShadow = "";
                  }
                }}
                onClick={() => router.push("/horaise-scheduler")}
              >
                <Stack gap="md" align="center" ta="center" style={{ height: "100%" }}>
                  <ThemeIcon
                    size={isMobile ? 60 : 80} // Ícone menor no mobile
                    radius="lg"
                    style={{
                      backgroundColor: "rgba(142, 201, 252, 0.2)",
                      color: "#0E1862",
                    }}
                  >
                    <IconCalendarEvent size={isMobile ? 30 : 40} />
                  </ThemeIcon>

                  <Box>
                    <Title order={2} size="h3" style={{ color: "#000000" }} fz={{ base: '1.1rem', md: '1.3rem' }}>
                      Scheduler
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Encontre horários para agendar reuniões com o seu time
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

              {/* CARD 2: EDITOR */}
              <Paper
                shadow="lg"
                p={{ base: "lg", md: "xl" }}
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
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.boxShadow = "";
                  }
                }}
                onClick={() => router.push("/horaise-editor")}
              >
                <Stack gap="md" align="center" ta="center" style={{ height: "100%" }}>
                  <ThemeIcon
                    size={isMobile ? 60 : 80}
                    radius="lg"
                    style={{
                      backgroundColor: "rgba(142, 201, 252, 0.2)",
                      color: "#0E1862",
                    }}
                  >
                    <IconEdit size={isMobile ? 30 : 40} />
                  </ThemeIcon>

                  <Box>
                    <Title order={2} size="h3" style={{ color: "#000000" }} fz={{ base: '1.1rem', md: '1.3rem' }}>
                      Editor
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Aloque e edite sua disponibilidade semanal
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

              {/* CARD 3: VIEWER */}
              <Paper
                shadow="lg"
                p={{ base: "lg", md: "xl" }}
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
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.boxShadow = "";
                  }
                }}
                onClick={() => router.push("/horaise-viewer")}
              >
                <Stack gap="md" align="center" ta="center" style={{ height: "100%" }}>
                  <ThemeIcon
                    size={isMobile ? 60 : 80}
                    radius="lg"
                    style={{
                      backgroundColor: "rgba(142, 201, 252, 0.2)",
                      color: "#0E1862",
                    }}
                  >
                    <IconEye size={isMobile ? 30 : 40} />
                  </ThemeIcon>

                  <Box>
                    <Title order={2} size="h3" style={{ color: "#000000" }} fz={{ base: '1.1rem', md: '1.3rem' }}>
                      Viewer
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Visualize os horários de todos os membros do time
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