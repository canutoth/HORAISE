"use client";

import { Box, Group, Text, Burger, Drawer, Stack,Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function TopNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  
  // Hook para controlar abertura/fechamento do menu mobile
  const [opened, { toggle, close }] = useDisclosure(false);

  const tabs = [
    { label: "Home", path: "/" },
    { label: "Scheduler", path: "/horaise-scheduler" },
    { label: "Viewer", path: "/horaise-viewer" },
    { label: "Editor", path: "/horaise-editor" },
    { label: "|", divider: true },
    { label: "Register", path: "/horaise-register" },
    { label: "Admin", path: "/horaise-admin" },
  ];

  return (
    <>
      <Box
        style={{
          width: "100%",
          height: 96,
          background: "#DFE3F4",
          padding: "24px 24px",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center", // Centraliza verticalmente
        }}
      >
        <Group justify="space-between" w="100%">
          
          {/* --- LOGO --- */}
          
          {/* Versão Desktop (Original) - Visível apenas em telas médias pra cima */}
          <Box visibleFrom="md">
            <Image
              src="/horaise.png"
              alt="HORAISE Logo"
              width={320}
              height={38.5}
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/")}
            />
          </Box>

          {/* Versão Mobile (Menor) - Visível apenas em telas pequenas */}
          <Box hiddenFrom="md">
            <Image
              src="/horaise.png"
              alt="HORAISE Logo"
              width={160} // Logo bem menor no mobile
              height={19.25} // Proporcional
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/")}
            />
          </Box>

          {/* --- MENU DESKTOP (Original) --- */}
          <Group gap="lg" visibleFrom="md">
            {tabs.map((item, index) => {
              if (item.divider) {
                return (
                  <Text
                    key={`divider-${index}`}
                    c="rgba(10, 35, 66, 0.6)"
                    fw={400}
                    style={{ userSelect: "none" }}
                  >
                    |
                  </Text>
                );
              }

              const isActive = pathname === item.path;

              return (
                <Text
                  key={item.path}
                  style={{ cursor: "pointer" }}
                  c={isActive ? "#0E1862" : "rgba(10, 35, 66, 0.6)"}
                  fw={isActive ? 600 : 500}
                  onClick={() => router.push(item.path!)} 
                >
                  {item.label}
                </Text>
              );
            })}
          </Group>

          {/* --- MENU MOBILE (Sanduíche) --- */}
          <Burger 
            opened={opened} 
            onClick={toggle} 
            hiddenFrom="md" 
            color="#0E1862"
            size="sm"
          />
        </Group>
      </Box>

      {/* --- DRAWER (Conteúdo do Menu Mobile) --- */}
      <Drawer
        opened={opened}
        onClose={close}
        size="75%" // Ocupa 75% da tela
        padding="md"
        hiddenFrom="md"
        zIndex={200}
        title={
          <Image
            src="/horaise.png"
            alt="HORAISE Logo"
            width={140}
            height={16.8}
          />
        }
      >
        <Stack gap="md" mt="xl">
          {tabs.map((item, index) => {
            // No mobile, geralmente não mostramos o divisor "|" visualmente como texto
            if (item.divider) return null;

            const isActive = pathname === item.path;

            return (
              <Button
                key={item.path}
                variant={isActive ? "light" : "subtle"}
                color="indigo" // Aproximação da cor #0E1862 no tema
                fullWidth
                justify="flex-start"
                size="md"
                onClick={() => {
                  router.push(item.path!);
                  close(); // Fecha o menu ao clicar
                }}
                styles={{
                  label: {
                    color: isActive ? "#0E1862" : "rgba(10, 35, 66, 0.8)",
                    fontWeight: isActive ? 700 : 500,
                  }
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>
      </Drawer>
    </>
  );
}