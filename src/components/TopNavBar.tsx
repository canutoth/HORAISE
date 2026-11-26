"use client";

import { Box, Group, Text, Burger, Drawer, Stack, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function TopNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { session, loading } = useAuthSession();
  const logged = !!session;

  const handleLogout = () => {
    window.location.href = "/api/auth/logout?redirect=/scheduler";
  };

  const renderLink = (
    label: string,
    path: string,
    key?: string,
    isButton = false
  ) => {
    const isActive = pathname === path;
    if (isButton) {
      return (
        <Button
          key={key}
          variant={isActive ? "light" : "subtle"}
          color="indigo"
          fullWidth
          justify="flex-start"
          size="md"
          onClick={() => {
            router.push(path);
            close();
          }}
          styles={{
            label: {
              color: isActive ? "#0E1862" : "rgba(10, 35, 66, 0.8)",
              fontWeight: isActive ? 700 : 500,
            },
          }}
        >
          {label}
        </Button>
      );
    }
    return (
      <Text
        key={key}
        style={{ cursor: "pointer" }}
        c={isActive ? "#0E1862" : "rgba(10, 35, 66, 0.6)"}
        fw={isActive ? 600 : 500}
        onClick={() => router.push(path)}
      >
        {label}
      </Text>
    );
  };

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
          alignItems: "center",
        }}
      >
        <Group justify="space-between" w="100%">
          {/* visível apenas em telas médias pra cima */}
          <Box visibleFrom="md">
            <Image
              src="/logoHoraise.png"
              alt="HORAISE Logo"
              width={320}
              height={38.5}
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/scheduler")}
            />
          </Box>

          {/* versão mobile menor*/}
          <Box hiddenFrom="md">
            <Image
              src="/logoHoraise.png"
              alt="HORAISE Logo"
              width={160}
              height={19.25}
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/scheduler")}
            />
          </Box>

          <Group gap="lg" visibleFrom="md">
            {renderLink("Scheduler", "/scheduler")}
            {logged ? (
              <>
                {session?.role === "admin"
                  ? renderLink("Painel", "/admin")
                  : renderLink(
                      "Meus Horários",
                      `/edit-content/${encodeURIComponent(session?.email || "")}`
                    )}
                <Text
                  c="rgba(10, 35, 66, 0.6)"
                  fw={400}
                  style={{ userSelect: "none" }}
                >
                  |
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </>
            ) : (
              !loading && (
                <>
                  <Text
                    c="rgba(10, 35, 66, 0.6)"
                    fw={400}
                    style={{ userSelect: "none" }}
                  >
                    |
                  </Text>
                  <Text
                    style={{ cursor: "pointer" }}
                    c={
                      pathname === "/login"
                        ? "#0E1862"
                        : "rgba(10, 35, 66, 0.6)"
                    }
                    fw={pathname === "/login" ? 600 : 500}
                    onClick={() => router.push("/login")}
                  >
                    Login
                  </Text>
                  <Text
                    style={{ cursor: "pointer" }}
                    c={
                      pathname === "/register"
                        ? "#0E1862"
                        : "rgba(10, 35, 66, 0.6)"
                    }
                    fw={pathname === "/register" ? 600 : 500}
                    onClick={() => router.push("/register")}
                  >
                    Register
                  </Text>
                </>
              )
            )}
          </Group>

          {/* menu sanduiche pra mobile */}
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="md"
            color="#0E1862"
            size="sm"
          />
        </Group>
      </Box>

      <Drawer
        opened={opened}
        onClose={close}
        size="75%"
        padding="md"
        hiddenFrom="md"
        zIndex={200}
        title={
          <Image
            src="/logoHoraise.png"
            alt="HORAISE Logo"
            width={140}
            height={16.8}
          />
        }
      >
        <Stack gap="md" mt="xl">
          {renderLink("Scheduler", "/scheduler", "scheduler", true)}
          {logged ? (
            <>
              {session?.role === "admin" ? (
                renderLink("Painel Admin", "/admin", "painel", true)
              ) : (
                renderLink(
                  "Meus Horários",
                  `/edit-content/${encodeURIComponent(session?.email || "")}`,
                  "meus-horarios",
                  true
                )
              )}
              <Button
                fullWidth
                variant="light"
                color="red"
                size="md"
                onClick={handleLogout}
              >
                Sair da conta
              </Button>
            </>
          ) : (
            <>
              {renderLink("Login", "/login", "login", true)}
              {renderLink("Register", "/register", "register", true)}
            </>
          )}
        </Stack>
      </Drawer>
    </>
  );
}